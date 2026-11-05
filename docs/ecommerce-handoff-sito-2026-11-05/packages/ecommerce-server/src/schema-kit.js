// Application-level Mongoose validation; Mongo collections remain schema-flexible.
// The caller supplies its own Connection: no default connection or Atlas credentials.
const registry = new WeakMap();
const opts = (kind, options = {}) => ({ kind, required: true, ...options });
export const field = Object.freeze({
  text: (max = 200, options = {}) => opts("text", { max, ...options }),
  choice: (values, options = {}) =>
    opts("text", { values, max: 100, ...options }),
  integer: (max = Number.MAX_SAFE_INTEGER, options = {}) =>
    opts("integer", { min: 0, max, ...options }),
  boolean: (options = {}) => opts("boolean", options),
  date: (options = {}) => opts("date", options),
  id: (options = {}) => opts("id", options),
  object: (fields, options = {}) => opts("object", { fields, ...options }),
  array: (item, max = 100, options = {}) =>
    opts("array", { item, max, ...options }),
});

function mongooseField(Schema, def) {
  const options = {
    required: def.required,
    ...(def.default !== undefined ? { default: def.default } : {}),
    ...(def.immutable ? { immutable: true } : {}),
    ...(def.secret ? { select: false } : {}),
  };
  switch (def.kind) {
    case "text":
      return {
        ...options,
        type: String,
        minlength: def.min ?? 1,
        maxlength: def.max,
        ...(def.values ? { enum: def.values } : {}),
        ...(def.pattern ? { match: new RegExp(def.pattern) } : {}),
      };
    case "integer":
      return {
        ...options,
        type: Number,
        min: def.min,
        max: def.max,
        validate: Number.isSafeInteger,
      };
    case "boolean":
      return { ...options, type: Boolean };
    case "date":
      return { ...options, type: Date };
    case "id":
      return { ...options, type: Schema.Types.ObjectId };
    case "object":
      return {
        ...options,
        type: new Schema(mongooseFields(Schema, def.fields), {
          _id: false,
          strict: "throw",
          minimize: false,
        }),
      };
    case "array":
      return {
        ...options,
        type: [mongooseField(Schema, def.item)],
        default: def.default,
        validate: (value) =>
          Array.isArray(value) &&
          value.length >= (def.min ?? 0) &&
          value.length <= def.max,
      };
    default:
      throw new Error("UNKNOWN_COMMERCE_FIELD");
  }
}
const mongooseFields = (Schema, fields) =>
  Object.fromEntries(
    Object.entries(fields).map(([key, def]) => [
      key,
      mongooseField(Schema, def),
    ]),
  );

export function defineCommerceModel(
  connection,
  collection,
  fields,
  indexes = [],
  options = {},
) {
  const { Schema } = connection.base;
  const allFields = {
    _id: field.id({ default: () => new connection.base.Types.ObjectId() }),
    shopId: field.text(80, { pattern: "^[A-Za-z0-9_-]+$", immutable: true }),
    schemaVersion: field.integer(1, { min: 1, default: 1, immutable: true }),
    revision: field.integer(options.appendOnly ? 0 : Number.MAX_SAFE_INTEGER, {
      default: 0,
      immutable: !!options.appendOnly,
    }),
    createdAt: field.date({ immutable: true, default: () => new Date() }),
    updatedAt: field.date({ default: () => new Date() }),
    ...fields,
  };
  const schema = new Schema(mongooseFields(Schema, allFields), {
    strict: "throw",
    strictQuery: "throw",
    timestamps: true,
    versionKey: false,
    minimize: false,
    autoIndex: false,
    autoCreate: false,
    bufferCommands: false,
  });
  for (const { key, ...indexOptions } of indexes)
    schema.index(key, indexOptions);
  if (options.validate)
    schema.pre("validate", function () {
      options.validate(this.toObject({ depopulate: true }));
    });
  if (options.appendOnly) {
    schema.pre("save", function () {
      if (!this.isNew) throw new Error("COMMERCE_APPEND_ONLY");
    });
    for (const operation of [
      "updateOne",
      "updateMany",
      "findOneAndUpdate",
      "replaceOne",
      "findOneAndReplace",
      "deleteOne",
      "deleteMany",
      "findOneAndDelete",
    ]) {
      schema.pre(operation, function () {
        throw new Error("COMMERCE_APPEND_ONLY");
      });
    }
  }
  const modelName = `Commerce_v1__${collection}`;
  const model =
    connection.models[modelName] ||
    connection.model(modelName, schema, collection);
  const description = Object.freeze({
    model,
    collection,
    indexes,
    immutableFields: Object.entries(allFields)
      .filter(([, def]) => def.immutable)
      .map(([key]) => key),
    appendOnly: !!options.appendOnly,
  });
  registry.set(model, description);
  return description;
}

export function describeCommerceModel(model) {
  const description = registry.get(model);
  if (!description) throw new Error("UNREGISTERED_COMMERCE_MODEL");
  return description;
}

export function unique(name, key, partialFilterExpression) {
  return {
    name,
    key,
    unique: true,
    ...(partialFilterExpression ? { partialFilterExpression } : {}),
  };
}
export function index(name, key, options = {}) {
  return { name, key, ...options };
}
export const publicId = () =>
  field.text(80, { pattern: "^[A-Za-z0-9_-]{16,80}$", immutable: true });
export const digest = (options = {}) =>
  field.text(64, { pattern: "^[a-f0-9]{64}$", ...options });
export const optional = { required: false };

export function assertInvariant(condition, code) {
  if (!condition) throw new Error(`COMMERCE_INVARIANT_${code}`);
}
