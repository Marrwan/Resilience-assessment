const mongoose = require('mongoose');
const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creator-cards';

const linkSchema = new mongoose.Schema(
  {
    title: { type: String },
    url: { type: String },
  },
  { _id: false }
);

const rateSchema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    amount: { type: Number },
  },
  { _id: false }
);

const schemaConfig = {
  _id: { type: SchemaTypes.ULID, required: true },
  title: { type: SchemaTypes.String, required: true },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String },
  creator_reference: { type: SchemaTypes.String, required: true, index: true },
  links: [linkSchema],
  service_rates: {
    currency: { type: SchemaTypes.String },
    rates: [rateSchema],
  },
  status: { type: SchemaTypes.String, required: true, index: true },
  access_type: { type: SchemaTypes.String, index: true },
  access_code: { type: SchemaTypes.String },
  created: { type: SchemaTypes.Number, required: true },
  updated: { type: SchemaTypes.Number, required: true },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });
modelSchema.index({ slug: 1 }, { unique: true });

module.exports = DatabaseModel.model('CreatorCard', modelSchema, {
  paranoid: true,
});
