var NeDBCollection = alchemy.use('nedb'),
    libpath = alchemy.use('path'),
    bson = alchemy.use('bson').BSONPure.BSON;

/**
 * NeDB Datasource, based on MongoDB
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var NeDB = Function.inherits('Alchemy.MongoDatasource', function NedbDatasource(name, _options) {

	var options,
	    uri;

	// Define default options
	this.options = {
		folder: null
	};

	Datasource.call(this, name, _options);

	// Cache collections in here
	this.collections = {};
});

/**
 * Prepare value to be stored in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NeDB.setMethod(function _valueToDatasource(field, value, data, callback) {

	var result;

	switch (field.datatype) {

		case 'objectid':
			result = ''+value;
			break;

		default:
			result = value;
	};

	setImmediate(function immediateDelay() {
		callback(null, result);
	});
});

/**
 * Prepare value to be returned to the app
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NeDB.setMethod(function _valueToApp(field, query, options, value, callback) {

	var result;

	switch (field.datatype) {

		case 'objectid':
			result = alchemy.castObjectId(value);

		default:
			result = value;
	};

	setImmediate(function immediateDelay() {
		callback(null, result);
	});
});

/**
 * Get a connection to the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Function}   callback
 */
NeDB.setMethod(function connect(callback) {
	if (callback) callback(null);
});

/**
 * Get an NeDB collection
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Function}   callback
 */
NeDB.setMethod(function collection(name, callback) {

	var that = this,
	    collection,
	    folderPath,
	    config;

	if (this.collections[name]) {
		setImmediate(function cachedCollection() {
			callback(null, that.collections[name]);
		});

		return;
	}

	if (this.options.folder) {
		folderPath = libpath.resolve(APP_ROOT, this.options.folder, name + '.nedb');
		collection = new NeDBCollection({filename: folderPath, autoload: true});
	} else {
		collection = new NeDBCollection();
	}

	that.collections[name] = collection;

	callback(null, collection);
});

/**
 * Create a record in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NeDB.setMethod(function _create(model, data, options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		if (err != null) {
			return callback(err);
		}

		collection.insert(data, function afterInsert(err, result) {

			// Clear the cache
			model.nukeCache();

			if (err != null) {
				return callback(err, result);
			}

			callback(null, Object.assign({}, data));
		});
	});
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NeDB.setMethod(function _read(model, query, _options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		var options,
		    cursor,
		    temp,
		    key;

		if (err != null) {
			return callback(err);
		}

		options = Object.assign({}, _options);

		for (key in query) {
			temp = query[key];

			// ObjectID values always need to be strings in nedb
			// This should be moved somewhere else, but it'll do for now
			if (temp && typeof temp == 'object' && temp.constructor && temp.constructor.name == 'ObjectID') {
				query[key] = ''+temp;
			}
		}

		// Create the cursor
		cursor = collection.find(query);

		// NeDB doesn't support passing a second object to the find method,
		// so we have to do it manually
		if (options.sort) {
			cursor.sort(options.sort);
		}

		if (options.skip) {
			cursor.skip(options.skip);
		}

		if (options.limit) {
			cursor.limit(options.limit);
		}

		Function.parallel({
			available: function getAvailable(next) {

				if (options.available === false) {
					return next(null, null);
				}

				// NeDB has no count on the cursor,
				// it is a separate method of the collection
				collection.count(query, next);
			},
			items: function getItems(next) {
				cursor.exec(next);
			}
		}, function done(err, data) {

			if (err != null) {
				return callback(err);
			}

			// There is no cache because NeDB stores everything in memory
			// anyway, it seems kind of silly

			callback(err, data.items, data.available);
		});
	});
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
NeDB.setMethod(function _ensureIndex(model, index, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		var options,
		    field,
		    obj,
		    key;

		if (err != null) {
			return callback(err);
		}

		if (Array.isArray(index.fields)) {
			field = index.fields[0];
		} else if (typeof index.fields == 'string') {
			field = index.fields;
		} else if (index.fields) {
			field = Object.keys(index.fields)[0];
		}

		options = {
			fieldName: field,
			name: index.options.name
		};

		if (index.options.unique) {
			options.unique = true;
		}

		if (index.options.sparse) {
			options.sparse = true;
		}

		collection.ensureIndex(options, callback);
	});
});