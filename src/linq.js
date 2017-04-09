
(function(global){
    "use strict";

    var tostring = Object.prototype.toString,
        slice = [].slice,
        splice = [].splice,
        push = [].push,
        isArray = function (obj) {
            return Array.isArray(obj);
        },
        isFunction = function (obj) {
            return typeof obj === 'function';
        };

    var LinqArray = function (source) {
        if (!LinqArray.isLinq(this)) {
            return new LinqArray(source);
        }
        if(tostring.call(source) === '[object Arguments]'){
            source = slice.call(source);
        } else if (LinqArray.isLinq(source)) {
            source = source.array();
        }
        this.source = isArray(source) ? slice.call(source, 0) : [];
    };

    
    LinqArray.isLinq = function(obj){
        return obj instanceof LinqArray;
    };

    LinqArray.prototype = {
        constructor: LinqArray,
        each: function (callback, reverse) {
            var arr = this.source,
                l = arr.length,
                i = 0;

            if (reverse) {
                while (l--) {
                    if (callback.call(arr[l], arr[l], l) === false) break;
                }
            } else {
                for (; i < l; i++) {
                    if (callback.call(arr[i], arr[i], i) === false) break;
                }
            }
            return this;
        },
        add: function () {
            push.apply(this.source, arguments);
            return this;
        },
        insert: function (index) {
            var args = slice.call(arguments, 0);
            splice.call(args, 1, 0, 0);
            splice.apply(this.source, args);
            return this;
        },
        remove: function (callback) {
            var temp;
            if(typeof callback === 'number'){
                temp = callback;
                callback = function(item, i){
                    return i === temp;
                }
            }
            this.source = this.where(function (item, i) {
                return !callback.call(item, item, i);
            }).source;
            return this;
        },
        where: function (callback) {
            var result = new LinqArray();
            this.each(function (item, i) {
                if (callback.call(item, item, i)) {
                    result.add(item);
                }
            });
            return result;
        },
        first: function (callback) {
            var result;

            if (isFunction(callback)) {
                this.each(function (item, i) {
                    if (callback.call(item, item, i)) {
                        result = item;
                        return false;
                    }
                });
            } else {
                result = this.source[0];
            }
            return result;
        },
        last: function (callback) {
            var result;

            if (isFunction(callback)) {
                this.each(function (item, i) {
                    if (callback.call(item, item, i)) {
                        result = item;
                        return false;
                    }
                }, true);
            } else {
                result = this.source[this.source.length - 1];
            }
            return result;
        },
        indexOf: function(callback, reverse){
            var result = -1;
            this.each(function (item, i) {
                if (callback.call(item, item, i)) {
                    result = i;
                    return false;
                }
            }, reverse);
            return result;
        },
        skip: function(count){
            return this.where(function(item, i){
                return i >= count;
            });
        },
        take: function(count){
            return this.where(function(item, i){
                return i < count;
            });
        },
        select: function (callback, reverse) {
            var result = new LinqArray([]);
            this.each(function (item, i) {
                result.add(callback.call(item, item, i));
            }, reverse);
            return result;
        },
        selectmany: function (callback) {
            var result = new LinqArray(),
                obj;
            this.each(function (item, i) {
                obj = callback.call(item, item, i);
                if(LinqArray.isLinq(obj)){
                    result.add.apply(result, obj.source);
                }else if(obj !== undefined){
                    result.add[isArray(obj) ? 'apply' : 'call'](result, obj);
                }
            });
            return result;
        },
        selectall: function(){
            var results = this.clone();
            while(results.any(function(){
                return isArray(this);
            })){
                results = results.selectmany(function(){
                    return this;
                });
            }
            return results;
        },
        group: function (callback) {
            var map = {},
                result = new LinqArray(),
                key;

            this.each(function (item, i) {
                i = callback.call(item, item, i) || '';
                key = JSON.stringify(i);
                map[key] = map[key] || [];
                map[key].push(item);
            });

            for (key in map) {
                var list = new LinqArray(map[key]);
                list.key = JSON.parse(key);
                result.add(list);
            }

            return result;
        },
        unique: function (callback) {
            var map = {},
                result = new LinqArray(),
                key;

            callback = callback || function(item){ return item; }

            this.each(function (item, i) {
                i = callback.call(item, item, i) || '';
                key = JSON.stringify(i);
                map[key] = i;
            });
            for (key in map) {
                if(map[key]) result.add(map[key]);
            }
            return result;
        },
        max: function (callback) {
            var items = isFunction(callback) ? this.select(callback) : this;

            return Math.max.apply(null, items.selectmany(function (item) {
                return item;
            }).array());
        },
        min: function (callback) {
            var items = isFunction(callback) ? this.select(callback) : this;

            return Math.min.apply(null, items.selectmany(function (item) {
                return item;
            }).array());
        },
        sum: function(callback){
            var items = isFunction(callback) ? this.select(callback) : this;
            var result = 0;

            items.selectmany(function (item) {
                return item;
            }).each(function(item){
                if(!isNaN(item)){
                    result += Number(item);
                }
            })

            return result;
        },
        avg: function(callback){
            var results = isFunction(callback) ? this.selectmany(callback) : this;
            return results.sum() / results.count();
        },
        sort: function(callback){
            var args = slice.call(arguments, 0),
                len = args.length,
                i = 0,
                arg,
                rights = this.each(function(){
                    this.__right = [];
                });
            if(len){
                while(i < len){
                    arg = args[i];
                    if(isFunction(arg)){
                        rights.each(function(item, j){
                            this.__right.push(arg.call(item, item, j));
                        })
                    }else{
                        rights.each(function(item, j){
                            this.__right.push(item[arg]);
                        })
                    }
                    i++;
                }
            }else{
                rights.each(function(item, j){
                    this.__right.push(item);
                })
            }
            rights.source.sort(function(a, b){
                i = 0;
                len = a.__right.length;
                while(i < len){
                    if(a.__right[i] > b.__right[i]) return 1;
                    i++;
                }
                return -1;
            });
            this.each(function(item, j){
                delete item.__right;
            });
            return this;
        },
        sortDesc: function(callback){
            var args = slice.call(arguments, 0),
                len = args.length,
                i = 0,
                arg,
                rights = this.each(function(){
                    this.__right = [];
                });
            if(len){
                while(i < len){
                    arg = args[i];
                    if(isFunction(arg)){
                        rights.each(function(item, j){
                            this.__right.push(arg.call(item, item, j));
                        })
                    }else{
                        rights.each(function(item, j){
                            this.__right.push(item[arg]);
                        })
                    }
                    i++;
                }
            }else{
                rights.each(function(item, j){
                    this.__right.push(item);
                })
            }
            rights.source.sort(function(a, b){
                i = 0;
                len = a.__right.length;
                while(i < len){
                    if(a.__right[i] < b.__right[i]) return 1;
                    i++;
                }
                return -1;
            });
            this.each(function(item, j){
                delete item.__right;
            });
            return this;
        },
        reverse: function () {
            var result = new LinqArray([]);

            this.each(function (item) {
                result.add(item);
            }, true);

            return result;
        },
        concat: function (source) {
            var results = this.clone();

            push.apply(results.source, new LinqArray(source).source);
            return results;
        },
        clone: function(){
            return new LinqArray(this.source.slice());
        },
        any: function (callback) {
            var result = false;
            this.each(function (item, i) {
                return !(result = callback.call(item, item, i));
            });
            return !!result;
        },
        all: function(callback){
            var result = true;
            this.each(function (item, i) {
                return !!(result = callback.call(item, item, i));
            });
            return result;
        },
        count: function (callback) {
            return (isFunction(callback) ? this.where(callback) : this).source.length;
        },
        join: function(s){
            return this.array().join(s);
        },
        array: function () {
            return this.source;
        },
        eq: function(idx){
            return this.source[idx];
        }
    }

    global.linq = LinqArray;
})(window.XT = window.XT || {});