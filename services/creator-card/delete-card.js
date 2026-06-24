const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const CreatorCard = require('@app/repository/creator-card');
const { CreatorCardMessages } = require('@app/messages');

const deleteCardSpec = `root {
  slug string<trim|minLength:1>
  creator_reference string<length:20>
}`;

const parsedDeleteCardSpec = validator.parse(deleteCardSpec);

async function deleteCard(serviceData, _options = {}) {
  const validatedData = validator.validate(serviceData, parsedDeleteCardSpec);

  const card = await CreatorCard.findOne({
    query: {
      slug: validatedData.slug,
      creator_reference: validatedData.creator_reference,
    },
  });

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  const deletionTimestamp = Date.now();
  await CreatorCard.deleteOne({ query: { _id: card._id } });

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
    access_code: card.access_code,
    created: card.created,
    updated: card.updated,
    deleted: deletionTimestamp,
  };

  return result;
}

module.exports = deleteCard;
