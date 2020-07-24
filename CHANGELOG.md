## 0.6.0 (2020-07-24)

* Make compatible with alchemy >1.1.0
* Nullify the connect property of the NeDB datasource class
* Enable using in-memory database

## 0.5.0 (2019-01-14)

* Make compatible with alchemy >1.0.7
* Indicate this datasource does not support ObjectIDs by setting the support flag to false
* Store files in the `PATH_TEMP` folder when no folder path is given
* Add `_remove()` implementation

## 0.4.0 (2017-08-27)

* Fix: make sure ObjectIDs are cast to strings

## 0.3.0 (2016-10-04)

* Adapt plugin to alchemymvc 0.3.0
* Publish on npm