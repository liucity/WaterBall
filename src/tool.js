;(function (global) {
    var arr = [];
    var hasOwn = arr.hasOwnProperty;
    var tostring = Object.prototype.toString;
    var slice = arr.slice;
    var type = function (obj) {
        switch(tostring.call(obj)){
            case '[object Object]': return 'object';
            case '[object Number]': return 'number';
            case '[object String]': return 'string';
            case '[object Function]': return 'function';
            case '[object Array]': return 'array';
            case '[object Arguments]': return 'arguments';
            case '[object Boolean]': return 'bool';
        }
    }
    
    var tool = {
        version: '0.0.1',
        type: type,
        isObject: function (obj) {
            return type(obj) === 'object';
        },
        isArray: function (obj) {
            return type(obj) === 'array';
        },
        isFunction: function (obj) {
            return type(obj) === 'function';
        },
        isString: function (obj) {
            return type(obj) === 'string';
        },
        isWindow: function( obj ) {
            return obj != null && obj === obj.window;
        },
        isPlainObject: function(obj){
            if (type( obj ) !== "object" || obj.nodeType || tool.isWindow( obj ) ) return false;
            if (obj.constructor && !hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) )return false;
            return true;
        },
        toArray: function(obj){
            switch(type(obj)){
                case 'arguments': return slice.call(obj);
                case 'array': return obj;
                default: return undefined;
            }
        },
        formatter: function (format) {
        },
        error: function (msg) {
            throw new Error(msg);
        }
    }

    var isArray = tool.isArray;
    var isFunction = tool.isFunction;
    var isPlainObject = tool.isPlainObject;
    tool.each = function (obj, callback) {
        var i = 0, name, length = obj.length;
        if (isArray(obj)) {
            for (; i < length; ) {
                if (callback.call(obj[i], i, obj[i++]) === false) break;
            }
        } else {
            for (name in obj) {
                if (callback.call(obj[name], name, obj[name]) === false) break;
            }
        }
    }
    
    var each = tool.each;
    var extend = function (copyAllProperty, target) {
        var args = slice.call(arguments, 1);
        if(type(copyAllProperty) !== 'bool'){
            target = copyAllProperty;
            copyAllProperty = false;
        }else{
            args = args.slice(1);
        }
        target = typeof target === 'object' || isFunction(target) ? target : {};

        each(args, function (i, item) {
            if(typeof item === 'object'){
                each(item, function (k, v) {
                    if ((copyAllProperty || hasOwn.call(item, k)) && v != undefined) {
                        if(typeof v === 'object' && isPlainObject(v)){
                            target[k] = extend(copyAllProperty, target[k], v);
                        }else{
                            target[k] = v;
                        }
                    }
                });
            }
        });
        return target;
    }
    tool.extend = extend;

    tool.replacer = (function () {
        var replacer_reg = /\{\s*([^\}]*)\s*\}/g;
        var getProperty = function (obj, properties) {
            var pArr = properties.split('.'),
                len = pArr.length,
                i = 0;

            for (; obj && i < len; i++) obj = obj[pArr[i]];
            return obj;
        }

        return function (temp, datas, callback) {
            var html, v;
            if (!temp) return;
            if (!datas) return temp;
            if (!isArray(datas)) datas = [datas];
            if (!isFunction(callback)) callback = function (data, m) {
                v = getProperty(data, m);
                return v === undefined ?
                    typeof data === 'string' || typeof data === 'number' ? data : ''
                    :
                    v;
            };
            html = [];
            each(datas, function (i, data) {
                html.push(temp.replace(replacer_reg, function (m, k) {
                    return callback(data, k);
                }));
            })
            return html.join('');
        }
    })()

    
    if(global.tool){
        if(global.tool.version){
            if (global.tool.version > tool.version){
                return false;
            }
        }else{
            tool.error('there contains another tool');
        }
    }
    global.tool = tool;
})(window.XT = window.XT || {});