const validator = require('@app-core/validator');
const { ulid } = require('@app-core/randomness');
const { throwAppError } = require('@app-core/errors');
const CreatorCard = require('@app/repository/creator-card');
const { CreatorCardMessages } = require('@app/messages');

const createCardSpec = `root {
  title string<trim|minLength:3|maxLength:100>
  description? string<trim|maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|minLength:1|maxLength:100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|minLength:3|maxLength:100>
      description string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedCreateCardSpec = validator.parse(createCardSpec);

function generateRandomSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    suffix += chars[idx];
  }
  return suffix;
}

function isValidSlugFormat(slug) {
  const allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  for (let i = 0; i < slug.length; i++) {
    if (allowed.indexOf(slug[i]) === -1) {
      return false;
    }
  }
  return true;
}

function isAlphanumeric(str) {
  if (typeof str !== 'string') return false;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < str.length; i++) {
    if (chars.indexOf(str[i]) === -1) return false;
  }
  return true;
}

async function createCard(serviceData, _options = {}) {
  const validatedData = validator.validate(serviceData, parsedCreateCardSpec);

  const accessType = validatedData.access_type || 'public';
  if (accessType === 'private') {
    if (!validatedData.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC01');
    }
    if (!isAlphanumeric(validatedData.access_code) || validatedData.access_code.length !== 6) {
      throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE_FORMAT, 'AC01');
    }
  } else if (validatedData.access_code !== undefined && validatedData.access_code !== null) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_FORBIDDEN, 'AC05');
  }

  if (validatedData.links) {
    for (let i = 0; i < validatedData.links.length; i++) {
      const link = validatedData.links[i];
      if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
        throwAppError(CreatorCardMessages.INVALID_LINK_URL, 'VALIDATION_ERROR');
      }
    }
  }

  if (validatedData.service_rates && validatedData.service_rates.rates) {
    for (let i = 0; i < validatedData.service_rates.rates.length; i++) {
      const rate = validatedData.service_rates.rates[i];
      if (!Number.isInteger(rate.amount) || rate.amount <= 0) {
        throwAppError(CreatorCardMessages.INVALID_SERVICE_RATE_AMOUNT, 'VALIDATION_ERROR');
      }
    }
  }

  let slug;
  if (validatedData.slug) {
    if (!isValidSlugFormat(validatedData.slug)) {
      throwAppError(CreatorCardMessages.INVALID_SLUG_FORMAT, 'VALIDATION_ERROR');
    }
    const existing = await CreatorCard.findOne({ query: { slug: validatedData.slug } });
    if (existing) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, 'SL02');
    }
    slug = validatedData.slug;
  } else {
    let baseSlug = validatedData.title.toLowerCase();
    let replaced = '';
    for (let i = 0; i < baseSlug.length; i++) {
      const char = baseSlug[i];
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        replaced += '-';
      } else {
        replaced += char;
      }
    }
    baseSlug = replaced;

    const allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-_';
    let filtered = '';
    for (let i = 0; i < baseSlug.length; i++) {
      if (allowed.indexOf(baseSlug[i]) !== -1) {
        filtered += baseSlug[i];
      }
    }
    baseSlug = filtered;

    if (baseSlug.length < 5) {
      let taken = true;
      while (taken) {
        slug = `${baseSlug}-${generateRandomSuffix()}`;
        // eslint-disable-next-line no-await-in-loop
        const existing = await CreatorCard.findOne({ query: { slug } });
        if (!existing) taken = false;
      }
    } else {
      const existing = await CreatorCard.findOne({ query: { slug: baseSlug } });
      if (existing) {
        let taken = true;
        while (taken) {
          slug = `${baseSlug}-${generateRandomSuffix()}`;
          // eslint-disable-next-line no-await-in-loop
          const duplicateCheck = await CreatorCard.findOne({ query: { slug } });
          if (!duplicateCheck) taken = false;
        }
      } else {
        slug = baseSlug;
      }
    }
  }

  const id = ulid();
  const createdCard = await CreatorCard.create({
    _id: id,
    title: validatedData.title,
    description: validatedData.description || '',
    slug,
    creator_reference: validatedData.creator_reference,
    links: validatedData.links || [],
    service_rates: validatedData.service_rates || null,
    status: validatedData.status,
    access_type: accessType,
    access_code: validatedData.access_code || null,
    created: Date.now(),
    updated: Date.now(),
  });

  const cleanLinks = (links) => {
    if (!links) return [];
    return links.map((l) => ({
      title: l.title,
      url: l.url,
    }));
  };

  const cleanServiceRates = (sr) => {
    if (!sr) return null;
    return {
      currency: sr.currency,
      rates: (sr.rates || []).map((r) => ({
        name: r.name,
        description: r.description,
        amount: r.amount,
      })),
    };
  };

  const result = {
    id: createdCard._id,
    title: createdCard.title,
    description: createdCard.description,
    slug: createdCard.slug,
    creator_reference: createdCard.creator_reference,
    links: cleanLinks(createdCard.links),
    service_rates: cleanServiceRates(createdCard.service_rates),
    status: createdCard.status,
    access_type: createdCard.access_type,
    access_code: createdCard.access_code,
    created: createdCard.created,
    updated: createdCard.updated,
    deleted: createdCard.deleted === 0 ? null : createdCard.deleted,
  };

  return result;
}

module.exports = createCard;
