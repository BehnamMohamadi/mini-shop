class ApiFeatures {
  constructor(model, queryString) {
    this.model = model;
    this.queryString = queryString;
  }

  sort() {
    const { sort: sortBy = "name" } = this.queryString;

    this.model = this.model.sort(sortBy);

    return this;
  }

  paginate() {
    const { page = 1, limit = 10 } = this.queryString;

    const skip = (page * 1 - 1) * (limit * 1);

    this.model = this.model.skip(skip).limit(limit * 1);

    return this;
  }

  limitFields() {
    const { fields = "-__v" } = this.queryString;

    this.model = this.model.select(fields.split(","));

    return this;
  }

  filter() {
    const { sort, page, limit, fields, ...filter } = this.queryString;

    const filterAsJson = JSON.stringify(filter).replace(
      /\b(gt|gte|lt|lte)\b/g,
      (match) => `$${match}`
    );

    this.model = this.model.find(JSON.parse(filterAsJson));

    return this;
  }
}

module.exports = { ApiFeatures };
