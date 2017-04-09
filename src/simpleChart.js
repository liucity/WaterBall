;(function (global) {
    //manage image source
    var tool = global.tool;
    var splice = [].splice;

    var sourceManager = {
        cache: {},
        load: function(type, source, callback){
            var manager = this;
            var obj = manager.cache[source];
            if(obj){
                if(obj.complete){
                    if(tool.isFunction(callback)) callback.call(obj, obj);
                }else{
                    var _onload = obj.onload;
                    obj.onload = function(){
                        _onload();
                        manager.load(type, source, callback);
                    }
                }
            }else{
                obj = document.createElement(type);
                obj.src = source;
                obj.onload = function(){
                    return manager.load(type, source, callback);
                }
                manager.cache[source] = obj;
            }
            return obj;
        }
    }

    global.sourceManager = sourceManager;
})(window.XT = window.XT || {});

;(function (global) {
    var linq = global.linq;
    var tool = global.tool;
    var canvas = global.canvas;
    var isFunction = tool.isFunction;
    
    var inRange = function (v, min, max) {
        return Math.max(min, Math.min(max, v));
    }
    var getNumber = (function () {
        var reg = /(-|\d|\.)/g;
        return function (v) {
            var arr = [];
            (v||'').replace(reg, function (m) {
                arr.push(m);
            })
            return Number(arr.join('') || 0);
        }
    })();
    var getAvailableValue = function(){
        var l = arguments.length, i = 0;
        while(i < l){
            if(arguments[i] != undefined) return arguments[i];
            i++;
        }
    }
    
    var hasBreak = (function(){
        var _reg = /\r/;
        return function(txt){
            return _reg.test(txt);
        }
    })();
    var spaceReg = /\s+/g;
    var breakReg = /\r/g;
    var chineseReg = /.*[\u4e00-\u9fa5]+.*$/;

    var dataSet = (function(){
        var _dataSet = {};
        var lastID;
        var id = function(){
            var _id;
            while((_id = Date.now()) !== lastID) lastID = _id;
            return _id;
        }
        
        return function(dom, v){
            if(!dom.dataset['chart_id']) dom.dataset['chart_id'] = id();
            if(v !== undefined) {
                _dataSet[dom.dataset['chart_id']] = v;
                return dom;
            }
            return _dataSet[dom.dataset['chart_id']];
        }
    })();
    
    var chart = function (dom, items, callback, params) {
        if(!dom || dom.tagName !== 'CANVAS') {
            tool.error('please use canvas element!');
            return false;
        }
        
        var _canvas = dataSet(dom);
        if(!_canvas){
            _canvas = new canvas({
                dom: dom,
                event: callback
            })
            
            _canvas.height = dom.height;
            _canvas.width = dom.width;
        }
        
        if(!tool.isArray(items)) items = [items];
        
        _canvas.items = chart.getItems(_canvas, items, params);
        _canvas.render = function (opts) {
            var t = opts.time;
            var state;
            var ctx = this.getContext();
            this.clean();
            this.items.each(function () {
                !this.isDisabled && (state = this.render(_canvas, ctx, t) !== false || state);
            })
            return state !== false;
        }
        
        _canvas.draw(true);
        return _canvas;
    }
    
    tool.extend(chart, {
        getItems: function (_canvas, items, params) {
            var cht = this;
            var opts = tool.extend({
                w: _canvas.width,
                h: _canvas.height,
                items: new linq(items),
                canvas: _canvas,
                space: 5
            }, params);
            
            return opts.items.selectmany(function (item, i) {
                var _items = cht[item.type].call(cht, item, i, opts);
                if(!linq.isLinq(_items)){
                    if(!tool.isArray(_items)) _items = [_items];
                    _items = new linq(_items);
                }
                return _items.selectall().each(function () {
                    this.data = this.data || item;
                    this.index = i;
                });
            });
        },
        waterball: function (item, index, options) {
            return new WaterBall(item.min, item.val, item.max, options.w / 2, options.h / 2, item.radius, item);
        },
        processbar: function(item, index, options) {
            var space = item.space !== undefined ? item.space : options.space;
            var barH = inRange(options.h - space * 2, 0, 30);
            var bar = new ProcessBar(item.min, item.val, item.max, space, (options.h - barH) / 2, options.w - space * 2, barH, item);
            
            return bar;
        },
        slots: function(item, index, options) {
            var font = item.font || Slots.prototype.font;
            var w = canvas.getTextWidth(font, item.lable);
            var h = canvas.getTextHeight(font);
            var label = new Slots(item.label, (options.w - w) / 2, options.h / 2, item);
            
            return label;
        },
        increaseNumber: function(item, index, options){
            var font = item.font || IncreaseNumber.prototype.font;
            var w = canvas.getTextWidth(font, item.lable);
            var h = canvas.getTextHeight(font);
            var label = new IncreaseNumber(item.label, (options.w - w) / 2, options.h / 2, item);
            
            return label;
        },
        mediaBall: function(item, index, options){
            return new MediaBall(item.label, item.image, item.x, item.y, item.scale, item.radius, item)
        }
    });

    
    /*-------------------------------------------------------------------------------------------------------------
        Animation Defination
    */
    
    var Animations = {
        /*
            s:starting value
            e:final value
            d:duration of animation
        */
        PI: Math.PI,
        PI2: Math.PI / 2,
        linear: function(s, e, d){
            var a = (e - s) / d, b = s;  
            return function(t){
                if(a * t + b < 0) console.log(a , t , b)
                return a * t + b;
            }
        },
        sinEaseIn: function(s, e, d){
            var a = -(e - s),
                w = this.PI2 / d,
                b = e;
            return function(t){
                return a * Math.sin(w * t) + b;
            }
        },
        sinEaseOut: function(s, e, d){
            var a = e - s,
                w = this.PI2 / d,
                b = s;
            return function(t){
                return a * Math.sin(w * t) + b;
            }
        },
        sinEaseInOut: function(s, e, d){
            var a = -(e - s) / 2,
                w = this.PI / d,
                b = s;
            return function(t){
                return a * (Math.cos(w * t) - 1) + b;
            } 
        },
        quadEaseIn: function(s, e, d){
            var a = e - s,
                b = s;
            return function(t){
                return a * (t/=d) * t + b;
            }
        },
        quadEaseOut: function(s, e, d){
            var a = -(e - s),
                b = s;
            return function(t){
                return a * (t/=d) * (t-2) + b;
            }
        },
        quadEaseInOut: function(s, e, d){
            var a = (e - s) / 2,
                b = s;
            return function(t){
                return (t/=d/2) < 1 ? a * t * t + b : -a * ((--t) * (t - 2) - 1) + b;
            }
        },
        step: function(s, e, d){
            return function(){
                return e;
            };
        }
    };

    var Base = {
        animateType: 'linear',
        animateDuration: 1000,
        isDisabled: false,
        animate: function(property, oldValue, newValue, type, duration){
            var self = this;
            var _st,
                _lt,
                animate;

            type = type || this.animateType;
            duration = getAvailableValue(duration, this.animateDuration);
            oldValue = getAvailableValue(oldValue, this.getProperty(property), 0);
            newValue = getAvailableValue(newValue, oldValue);
            if(property && duration){
                animate = Animations[type in Animations ? type : 'step'](oldValue, newValue, duration);
                this[property] = function(t){
                    if(_st === undefined) _st = t;
                    t -= _st;
                    if(t > duration) {
                        self.trigger('animationEnd');
                        return self[property] = newValue; 
                    }
                    if(isNaN(t)) return self[property] = isNaN(_lt) ? newValue : animate(_lt); 
                    _lt = t;
                    return animate(t);
                };
            }

            return this;
        },
        trigger: function(type){
            isFunction(this[type]) && this[type]();
            return this;
        },
        getProperty: function(key, t){
            return isFunction(this[key]) ? this[key](t) : this[key];
        }
    }
    
    
    /*-------------------------------------------------------------------------------------------------------------
        Drawable Item Defination
    */

    var Label = function (content, x, y, w, h, params) {
        if(!(this instanceof Label)) return new Label(content, x, y, w, h, params);
        
        if(tool.isObject(x)){
            params = x;
            x = undefined;
        }else if(tool.isObject(w)){
            params = w;
            w = undefined;
        }

        tool.extend(this, this.initContent(content), params && {
            x: params.x,
            y: params.y,
            w: params.w,
            h: params.h,
            color: params.color,
            font: params.font,
            align: params.align,
            vertical: params.vertical,
            underline: params.underline,
            animateDuration: params.animateDuration
        }, {
            x: x,
            y: y,
            w: w,
            h: h
        });

        this.animate('alpha', 0, 1, 'linear');
    }
    
    Label.prototype = tool.extend({}, Base, {
        color: '#757171',
        font: 'normal 1em Microsoft YaHei',
        align: 'center',
        vertical: 'middle',
        underline: false,
        animateDuration: 500,
        render: function (_canvas, ctx, t) {
            var self = this;
            
            //    new Border( 'tip',  this.getFixedX() - this.w / 2, this.y - this.h / 2, this.w, this.h).render(_canvas);
            _canvas.partial(function(ctx){
                ctx.globalAlpha = self.getProperty('alpha', t);

                this.text(self.x, self.y, self.text, self);
                if(self.underline){
                    this.line([{
                        x: self.getFixedX() - self.w / 2, 
                        y: self.y + self.h / 2
                    },{
                        x: self.getFixedX() + self.w / 2, 
                        y: self.y + self.h / 2
                    }]).stroke({
                        color: self.color,
                        lineWidth: 1
                    });
                }
            })
        },
        initContent: function (content) {
            if(tool.isString(content)){
                return {
                    text: content
                };
            }
            return content || {}
        },
        inRange: function (x, y) {
            return this.getFixedX() - this.w / 2< x 
                    && this.getFixedX() + this.w / 2> x 
                    && this.y - this.h / 2 < y 
                    && this.y + this.h / 2> y;
        },
        getFixedX: function () {
            switch(this.align){
                case 'left': return this.x + this.w / 2;
                case 'right': return this.x - this.w / 2;
                default: return this.x;
            }
        }
    });

    var WaterBall = function (min, val, max, x, y, radius, params) {
        if(!(this instanceof WaterBall)) return new WaterBall(min, val, max, x, y, radius, params);
        
        tool.extend(this, {
            x: x,
            y: y,
            min: min || 0,
            val: val || 0,
            max: max || 1,
            radius: radius || 100
        }, params);

        this.val = inRange(this.val, this.min, this.max);
        if(this.label){
            var label = new IncreaseNumber(this.label, this.x, 0, this.label);
            if(this.label.y === undefined){
                var lH = canvas.getTextHeight(label.font);
                var hight = this.val / (this.max - this.min) * this.radius;
                label.y = lH > hight ? this.y + this.radius - hight - lH : this.y + this.radius - hight;
            }
            this.label = label;
        } 
        
        this.animate('val', 0, this.val, 'quadEaseInOut');
        return this;
    }
    
    WaterBall.prototype = tool.extend({}, Base, {
        lineWidth: 2,
        animateDuration: 1500,
        borderColor: 'rgba(0, 0, 0, 0.2)',
        color: function(v){
            return new canvas.color(197, 227, 250);
            // var HEGEXIAN = 0.5;
            // var range = this.max - this.min;
            // var fix = 0;
            // if(v < range * HEGEXIAN) fix = v / range;
            // else if(v < range * (0.5 + HEGEXIAN / 2)) fix = (v / range - HEGEXIAN) * 2 + HEGEXIAN;
            // else fix = 1;
            // return canvas.color.fix(new canvas.color(255,0,0), new canvas.color(197, 227, 250), fix);
        },
        render: function (_canvas, ctx, t) {
            var self = this;
            var a = this.radius / 25 - Math.sin(Math.PI / 2 / this.animateDuration * t) / 2;
            var w = 0.1;
            var o = t / 100;
            var val = this.getProperty('val', t);
            var h = val / (this.max - this.min) * this.radius * 2 - this.radius;
            var color = isFunction(this.color) ? this.color(val) : new canvas.color(this.color);
            
            _canvas.partial(function(ctx){
                ctx.translate(self.x, self.y);
                ctx.scale(1, -1);
                this.point(0, 0, self.radius)
                    .stroke({
                        lineWidth: self.lineWidth,
                        color: self.borderColor
                    });
                ctx.clip();

                //背景波
                this.wave({
                    x: -self.radius - 20,
                    y: h
                }, {
                    x: self.radius + 20,
                    y: h
                }, a, w, o, h);
                ctx.lineTo(self.radius + 20, -self.y);
                ctx.lineTo(-self.radius - 20, -self.y);
                ctx.closePath();

                this.fill({
                    color: color.alpha(0.3).toRGBA()
                })

                //前景波
                this.wave({
                    x: -self.radius - 20,
                    y: h
                }, {
                    x: self.radius + 20,
                    y: h
                }, a, w, -o, h);
                ctx.lineTo(self.radius + 20, -self.y);
                ctx.lineTo(-self.radius - 20, -self.y);
                ctx.closePath();

                var gradient = this.createRadialGradient(-self.radius / 2, self.radius / 2, 0, self.radius);
                gradient.addColorStop(0, color.alpha(0.3).toRGBA());
                gradient.addColorStop(0.5, color.alpha(0.8).toRGBA());
                gradient.addColorStop(1, color.alpha(1).toRGBA());
                this.fill({
                    color: gradient
                })
            });

            if(this.label && this.label.render) this.label.render(_canvas, ctx, t);
        },
        inRange: function (x, y) {
            return Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2) < Math.pow(this.radius, 2);
        },
        // mouseenter: function(){
        //     this.animate(this.animateDuration);
        // }
    });

    var ProcessBar = function (min, val, max, x, y, w, h, params) {
        if(!(this instanceof ProcessBar)) return new ProcessBar(min, val, max, x, y, w, h, params);
        
        tool.extend(this, {
            x: x,
            y: y,
            w: w || 1,
            h: h || 1,
            min: min || 0,
            val: val || 0,
            max: max || 1
        }, params);

        if(this.label){
            var label = new IncreaseNumber(this.label, this.x, this.y + this.h / 2, this.label);
            if(this.label.x === undefined){
                var lW = canvas.getTextWidth(label.font, label.text);
                var width = this.val / (this.max - this.min) * this.w;
                label.x = lW > width ? width + lW : width / 2;
            }
            this.label = label;
        } 
        
        this.animate('val', 0, this.val, 'quadEaseInOut');
        return this;
    }
    
    ProcessBar.prototype = tool.extend({}, Base, {
        lineWidth: 2,
        animateDuration: 1500,
        borderColor: 'rgba(0, 0, 0, 0.2)',
        color: new canvas.color(197, 227, 250),
        render: function (_canvas, ctx, t) {
            var self = this;
            var val = this.getProperty('val', t);
            var o = (t / 2 % this.animateDuration) / this.animateDuration || 0;
            var w = val / (this.max - this.min) * this.w;
            var color = isFunction(this.color) ? this.color(val) : new canvas.color(this.color);
            
            _canvas.partial(function(ctx){
                ctx.translate(self.x, self.y);
                this.rect(0, 0, self.w, self.h)
                    .stroke({
                        lineWidth: self.lineWidth,
                        color: self.borderColor
                    });
                
                var gradient = this.createLinearGradient(- w, 0, w * 2, 0);
                gradient.addColorStop(0, color.toRGBA());
                gradient.addColorStop(inRange(o - 0.3, 0, 1), color.toRGBA());
                gradient.addColorStop(o, color.clone().alpha(0.5).toRGBA());
                gradient.addColorStop(inRange(o + 0.15, 0, 1), color.toRGBA());
                gradient.addColorStop(1, color.toRGBA());
                this.rect(0, 0, w, self.h).fill({
                    color: gradient
                })
            });

            if(self.label && self.label.render) self.label.render(_canvas, ctx, t);
        },
        inRange: function (x, y) {
            return this.x < x 
                    && this.x + this.w > x 
                    && this.y < y 
                    && this.y + this.h > y;
        }
    });

    var Slots = function(label, x, y, params){
        if(!(this instanceof Slots)) return new Slots(label, x, y, params);
        
        Label.call(this, label, x, y, params)
        
        this.w = canvas.getTextWidth(this.font, this.text);
        this.h = canvas.getTextHeight(this.font);

        return this;
    }

    Slots.prototype = tool.extend(new Label(), {
        animateDuration: 1500,
        getNumbers: (function(){
            var source = '0123456789';
            var len = source.length;
            return function(index){
                index = index % len;
                if(index < 0) index += len;
                return source.substr(index) + source.substr(0, index);
            }
        })(),
        halfFontSize: (function(){
            var digReg = /\d+(\.\d+)?/i;
            return function(font){
                return new linq((font || '').split(' '), []).select(function(item){
                    return digReg.test(item) ? item.replace(digReg, function(m){
                        return m / 2;
                    }) : item;
                }).join(' ');
            }
        })(),
        render: function (_canvas, ctx, t) {
            var self = this;
            var duration = this.animateDuration;
            if(duration < t) return _canvas.text(this.x, this.y, this.text, self)
            
            _canvas.partial(function(){
                var h = self.h, x;
                var texts = self.text.split('') || [];
                var renderVerticalText = function(_x, _y, chars){
                    var temp = _y;
                    tool.each(chars, function(i, c){
                        if(-h <= temp && temp <= 2 * h) _canvas.text(_x, temp, c, false);
                        temp += h;
                    })
                }
                ctx.translate(self.x - self.w / 2, self.y - self.h / 2);

                this.rect(0, 0, self.w, h)
                    .clip();

                ctx.font = self.font;
                ctx.fillStyle = self.color;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';

                x = canvas.getTextWidth(self.font, texts[0]) / 2;
                tool.each(texts, function(i, c){
                    var a = -2 * (h * ( 10 * i + 10 - Number(c) - 1.5)) / Math.pow(duration, 2);
                    var len = - a * duration * t  + 1/2 * a * Math.pow(t, 2);
                    texts = self.getNumbers(4 - Math.floor(len / h)).split('');
                    renderVerticalText(x, len % h - 4 * h, texts);
                    x += canvas.getTextWidth(self.font, c);
                })
            })
        }
    });

    var IncreaseNumber = function(label, x, y, params){
        if(!(this instanceof IncreaseNumber)) return new IncreaseNumber(label, x, y, params);
        
        Label.call(this, label, x, y, params);

        this.animate('val', 0, this.getNumber(this.text), 'linear')
        return this;
    }

    IncreaseNumber.prototype = tool.extend(new Label(), {
        animateDuration: 1500,
        numberReg: /\d/g,
        getNumber: function(input){
            return (input || '').match(this.numberReg).join('');
        },
        render: function (_canvas, ctx, t) {
            var self = this;
            var duration = this.animateDuration;
            if(duration < t) return _canvas.text(this.x, this.y, this.text, self)
            
            _canvas.partial(function(){
                var number = Math.ceil(self.getProperty('val', t)) + '';
                var i = number.length;
                var text = new linq(self.text.split('') || []).select(function(c){
                    return isNaN(c) ? c : i > 0 ? number[--i] : 0;
                }, true).reverse().join('');
                _canvas.text(self.x, self.y, text, self);
            })
        }
    });

    var MediaBall = function(label, image, x, y, scale, radius, params){
        if(!(this instanceof MediaBall)) return new MediaBall(label, x, y, params);
        
        tool.extend(this, {
            label: label,
            image: image,
            x: x,
            y: y,
            scale: scale || 1,
            radius: radius || 100
        }, params);

        this.load();
        this.prepareLabels();

        return this;
    }

    MediaBall.prototype =  tool.extend(new Label(), {
        animateDuration: 0,
        vertical: 'top',
        load: function(){
            if(!this.imageSource){
                var self = this;
                this.isDisabled = true;
                XT.sourceManager.load('img', this.image, function(img){
                    self.imageSource = img;
                    self.isDisabled = false;
                });
            }
        },
        getAvailableWidth: function(h){
            return Math.floor(2 * Math.sqrt(Math.pow(this.radius, 2) - Math.pow(h, 2)));
        },
        prepareLabels: function(){
            if(this.label && !this.labels){
                var labels = [];
                var label = this.label;
                var h = canvas.getTextHeight(this.font);
                var ew = canvas.getTextWidth(this.font, label) / label.length;
                var _h = h;
                var count;
                while(label && _h < this.radius){
                    count = Math.floor(this.getAvailableWidth(_h) / ew);
                    labels.push(new Label(label.substr(0, count), 0, _h - h, this));
                    label = label.substr(count);
                    _h += h;
                }
                this.labels = labels;
            }
        },
        render: function (_canvas, ctx, t) {
            var self = this;
            var radius = this.radius;
            var imageSource = this.imageSource;
            var x = this.getProperty('x', t);
            var y = this.getProperty('y', t);
            var scale = this.getProperty('scale', t);
            
            _canvas.partial(function(){
                ctx.translate(x, y);
                ctx.scale(scale, scale);
                this.point(0, 0, radius)
                    .stroke({
                        lineWidth: self.lineWidth,
                        color: self.borderColor
                    })
                    .fill({
                        color: '#FFF'
                    });
                ctx.clip();

                if(imageSource){
                    var d = Math.min(imageSource.width / 2, imageSource.height);
                    ctx.drawImage(
                        imageSource,
                        (imageSource.width - d * 2) / 2, (imageSource.height - d) / 2, d * 2, d,
                        -radius, -radius, radius * 2, radius
                    );
                }
                if(self.labels){
                    tool.each(self.labels, function(){
                        this.render(_canvas, ctx, t);
                    })
                }
            })
            return false;
        }
    });
    
    global.simpleChart = chart;
})(window.XT = window.XT || {})