const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const CreatorCard = require('@app/repository/creator-card');
const { CreatorCardMessages } = require('@app/messages');

const getCardSpec = `root {
  slug string<trim|minLength:1>
  access_code? string
}`;

const parsedGetCardSpec = validator.parse(getCardSpec);

async function getCard(serviceData, _options = {}) {
  const validatedData = validator.validate(serviceData, parsedGetCardSpec);

  const card = await CreatorCard.findOne({ query: { slug: validatedData.slug } });

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  if (card.status === 'draft') {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF02');
  }

  if (card.access_type === 'private') {
    if (!validatedData.access_code) {
      throwAppError(CreatorCardMessages.CARD_IS_PRIVATE, 'AC03');
    }
    if (card.access_code !== validatedData.access_code) {
      throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
    }
  }

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
    id: card._id,
    title: card.title,
    description: card.description,
    slug: card.slug,
    creator_reference: card.creator_reference,
    links: cleanLinks(card.links),
    service_rates: cleanServiceRates(card.service_rates),
    status: card.status,
    access_type: card.access_type,
    created: card.created,
    updated: card.updated,
    deleted: card.deleted === 0 ? null : card.deleted,
  };

  return result;
}

module.exports = getCard;
