const { createHandler } = require('@app-core/server');
const getCardService = require('@app/services/creator-card/get-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const { slug } = rc.params;
    const accessCode = rc.query.access_code;

    const response = await getCardService({ slug, access_code: accessCode });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Retrieved Successfully.',
      data: response,
    };
  },
});
