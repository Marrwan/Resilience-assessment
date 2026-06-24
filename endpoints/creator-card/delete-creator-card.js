const { createHandler } = require('@app-core/server');
const deleteCardService = require('@app/services/creator-card/delete-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    const { slug } = rc.params;
    const creatorReference = rc.body.creator_reference;

    const response = await deleteCardService({ slug, creator_reference: creatorReference });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Deleted Successfully.',
      data: response,
    };
  },
});
