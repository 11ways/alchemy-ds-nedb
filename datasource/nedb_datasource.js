var NeDBCollection = alchemy.use('nedb'),
    bson = alchemy.use('bson').BSONPure.BSON;

/**
 * NeDB Datasource, based on MongoDB
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var NeDB = Function.inherits('MongoDatasource', function NedbDatasource(name, _options) {

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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NeDB.setMethod(function _valueToDatasource(field, value) {

	switch (field.datatype) {

		case 'objectid':
			return ''+value;

		default:
			return value;
	};
});

/**
 * Prepare value to be returned to the app
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NeDB.setMethod(function _valueToApp(field, value) {

	switch (field.datatype) {

		case 'objectid':
			return alchemy.castObjectId(value);

		default:
			return value;
	};
});

/**
 * Get an NeDB collection
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
		collection = new NeDBCollection({filename: APP_ROOT + '/' + this.options.folder + '/' + name + '.db', autoload: true});
	} else {
		collection = new NeDBCollection();
	}

	that.collections[name] = collection;

	callback(null, collection);
});

/**
 * Create a record in the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NeDB.setMethod(function _create(model, data, options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		if (err != null) {
			return callback(err);
		}

		collection.insert(data, function afterInsert(err, result) {
			callback(err, result);
		});
	});
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NeDB.setMethod(function _read(model, query, _options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		var options,
		    cursor

		if (err != null) {
			return callback(err);
		}

		options = Object.assign({}, _options);

		// Create the cursor
		cursor = collection.find(query, options);

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