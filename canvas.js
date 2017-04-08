;(function(global){
    "use strict";
    var linq = global.linq;
    var tool = global.tool;
    
    var PI = Math.PI;

    var Canvas = function(params){
        if(!(this instanceof Canvas)){
            return new Canvas(params);
        }

        tool.extend(this, {
            dom: null,
            render: null,
            event: null,
            cache: {},
            isRendering: false
        }, params);
        
        this.init();
        //this.draw();
    };

    Canvas.prototype = {
        constructor: Canvas,
        init: function(){
            var _canvas = this;
            var focused, redraw;
            var fire = function (type, obj, isRedraw) {
                    if(tool.isFunction(_canvas.event)) _canvas.event(type, obj); 
                    fired = {
                        type: type,
                        target: obj
                    };
                    redraw = isRedraw !== false;
                }, fired;
            var isInRange = function (e) {
                var x = e.offsetX,
                    y = e.offsetY,
                    focus;
                    
                fired = false;
                _canvas.items.each(function () {
                    if(this && this.inRange && this.inRange(x, y)){
                        focus = {
                            target: this,
                            color: this.color
                        }
                        return false;
                    }
                }, true)
                
                if(focus) {
                    if(focused){
                        if(focused.target !== focus.target){
                            fire('mouseleave', focused.target); 
                            focused = focus;
                            fire('mouseenter', focused.target); 
                        }else{
                            fire('mouseover', focused.target, tool.isFunction(focused.target['mouseover'])); 
                        }
                    }else{
                        focused = focus;
                        fire('mouseenter', focused.target); 
                    }
                }else{
                    if(focused){
                        fire('mouseleave', focused.target); 
                        focused = focus;
                    }
                }
                if(redraw) {
                    redraw = false;
                    _canvas.draw();
                }
                switch(e.type){
                    case 'click':
                        if(focused) fire('click', focused.target, false);
                        break;
                }
                if(fired){
                    if(tool.isFunction(fired.target[fired.type])) fired.target[fired.type](_canvas, e);
                }
            }
            this.dom.addEventListener('click', isInRange);
            this.dom.addEventListener('mousemove', isInRange);
            this.dom.addEventListener('mouseleave', function () {
                if(focused) fire('mouseleave', focused.target);
                focused = false;
            });
        },
        getTime: function (params) {
            return Date.now();
        },
        getContext: function(){
            return this.cache.context = this.cache.context || this.dom.getContext("2d");
        },
        draw: (function () {
            var requestFrame = window.requestAnimationFrame       ||
                     window.webkitRequestAnimationFrame ||
                     window.mozRequestAnimationFrame    ||
                     window.oRequestAnimationFrame      ||
                     window.msRequestAnimationFrame     ||
                     function(callback) {
                        window.setTimeout(callback, 1000 / 60);
                     };
            var cancelFrame = window.cancelAnimationFrame       ||
                     window.webkitCancelAnimationFrame	||
                     window.mozCancelAnimationFrame 	||
                     window.oCancelAnimationFrame	    ||
                     window.msCancelAnimationFrame     ||
                     function(id) {
                        clearTimeout(id);
                     };
            
            return function (cleanFrame) {
                if(cleanFrame) cancelFrame(this.rfID);
                if(!this._time) this._time = this.getTime();
                if(tool.isFunction(this.render) && this.render.call(this, { time: this.getTime() - this._time }) !== false){
                    if(this.dom && document.body.contains(this.dom)) this.rfID = requestFrame(this.draw.bind(this));
                } 
                return this;
            }
        })(),
        clean: function(x, y, w, h){
            var ctx = this.getContext();
            ctx.clearRect(w || 0, y || 0, w || this.dom.width, h || this.dom.height);
        },
        center: function (x, y) {
            this.cache.x = x = x - (this.cache.x || 0);
            this.cache.y = y = y - (this.cache.y || 0);
            this.getContext().translate(x, y);
        },
        rect: function(x, y, w, h){
            var ctx = this.getContext();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x, y + h);
            ctx.closePath();
            return this;
        },
        point: function (x, y, r) {
            var ctx = this.getContext();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, PI * 2);
            return this;
        },
        pie: function (x, y, r, starta, enda) {
            var ctx = this.getContext();
            ctx.beginPath();
            ctx.arc(x, y, r, starta - PI / 2, enda - PI / 2, false);
            ctx.lineTo(x, y);
            this.fill(this.styles);
            return this;
        },
        line: function (list) {
            var ctx = this.getContext();
            ctx.beginPath();
            tool.each(list, function (i, p) {
                ctx[i ? 'lineTo' : 'moveTo'](Math.round(p.x), Math.round(p.y));
            })
            return this;
        },
        dashLine: function (list, options) {
            var self = this;
            var dash = options && options.dash || 4, len, next, arc, temp;
            var ctx = this.getContext();
            tool.each(list, function (i, p) {
                next = list[i + 1];
                if(next){
                    len = Math.sqrt(Math.pow(next.x - this.x, 2) + Math.pow(next.y - this.y, 2));
                    arc = Math.atan2(next.y - this.y, next.x - this.x);
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(arc);
                    temp = 0;
                    ctx.beginPath();
                    while(temp < len){
                        ctx.moveTo(temp, 0);
                        temp = Math.min(len, temp + dash);
                        ctx.lineTo(temp, 0);
                        temp = Math.min(len, temp + dash);
                    }
                    ctx.closePath();
                    ctx.restore();
                }
            });
            return this;
        },
        wave: function(sp, ep, a, w, o, h, callback){
            var ctx = this.getContext();
            var x = sp.x;
            var percision = 0.5 / w;
            callback = callback || function(x, y){
                return y;
            }
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            for (; x <= ep.x; x += percision) {
                ctx.lineTo(x, callback(x, a * Math.sin(w * x + o) + h));
            }
            return this;
            // var precision = PI / 4 / w;
            // var getPoint = function(x){
            //     return {
            //         x: x,
            //         y: Math.round(a * Math.sin(w * x + o) + h)
            //     };
            // };
            // var points = [getPoint(sp.x)];
            // var _x = Math.ceil(sp.x / precision) * precision;
            // while(_x < ep.x){
            //     points.push(getPoint(_x));
            //     _x += precision;
            // }
            // points.push(getPoint(ep.x));
            // this.bezier(points);
        },
        bezier: function(points) {
            var ctx = this.getContext();
            var round = Math.round;
            var l = points.length, i = 2;
            var tx1, ty1, tx2, ty2, tmpx, tmpy;
            // var self = this;
            var renderArc = function(sp, p, ep){
                tx1 = (sp.x + p.x) / 2;
                ty1 = (sp.y + p.y) / 2;
                tx2 = (p.x + ep.x) / 2;
                ty2 = (p.y + ep.y) / 2;
                tmpx = p.x - (tx1 + tx2) / 2;
                tmpy = p.y - (ty1 + ty2) / 2;
                tx1 += tmpx;
                ty1 += tmpy;
                tx2 += tmpx;
                ty2 += tmpy;
                // self.point(tx1, ty1, 1).fill({ color: '#F00'})
                // self.point(tx2, ty2, 1).fill({ color: '#00F'})
                ctx.bezierCurveTo(round(tx1), round(ty1), round(tx2), round(ty2), round(ep.x), round(ep.y));
            }

            switch(l){
                case 1: return;
                case 2: return this.line(points);
            }
            ctx.beginPath();
            ctx.moveTo(round(points[0].x), round(points[0].y));
            for( ; i < l && points[i]; i+=2){
                // this.point(points[i - 2].x, points[i - 2].y, 1).fill()
                // this.point(points[i - 1].x, points[i - 1].y, 1).fill()
                // this.point(points[i].x, points[i].y, 1).fill()
                renderArc(points[i - 2], points[i - 1], points[i]);
            }
            return this;
        },

        //tools
        partial: function(callback){
            var ctx = this.getContext();
            ctx.save();
            callback.call(this, ctx);
            ctx.restore();
            return this;
        },

        //
        createRadialGradient: function(x, y, sr, er){
            return this.getContext().createRadialGradient(x,y,sr, x,y,er)
        },
        createLinearGradient: function(sx, sy, ex, ey){
            return this.getContext().createLinearGradient(sx, sy, ex, ey)
        },

        //render
        styles: {
            color: '#CCCCCC',
            lineWidth: 2,
            vertical: 'middle',
            align: 'center'
        },
        stroke: function(styles){
            var ctx = this.getContext();
            styles = tool.extend({}, this.styles, styles);
            ctx.lineWidth = styles.lineWidth;
            ctx.strokeStyle = styles.color;
            ctx.stroke();
            return this;
        },
        fill: function(styles){
            var ctx = this.getContext();
            styles = tool.extend({}, this.styles, styles);
            ctx.lineWidth = styles.lineWidth;
            ctx.fillStyle = styles.color;
            ctx.fill();
            return this;
        },
        clip: function(){
            this.getContext().clip();
            return this;
        },
        text: function(x, y, content, styles){
            var ctx = this.getContext();
            if(styles !== false){
                styles = tool.extend(true, {}, this.styles, styles);
                ctx.font = styles.font;
                ctx.textBaseline = styles.vertical;
                ctx.textAlign = styles.align;
                ctx.fillStyle = styles.color;
            }
            
            ctx.fillText(content, 
                            Math.round(x), 
                            Math.round(y));
        },

        //others
        toDataUrl: function(){
            return this.getContext().toDataUrl();
        }
    }
    
    ;(function(){
        var cache = {};
        var _div,
            getDiv = function () {
                if(!_div){
                    _div = document.createElement('div');
                    tool.extend(_div.style, {
                        'position': 'absolute',
                        top: -100,
                        left: -100
                    });
                    document.getElementsByTagName('body')[0].appendChild(_div);
                }
                return _div;
            }
        
        Canvas.getTextHeight = function(font){
            if (!cache[font]) {
                var div = getDiv();
                div.innerHTML = 'abcdefghijklmnopqrstuvwxyz0123456789';
                div.style['display'] = '';
                div.style['font'] = font;
                cache[font] = div.offsetHeight;
                div.style['display'] = 'none';
            }
            return cache[font];
        }
        
        Canvas.getTextWidth = function(font, html){
            var div = getDiv();
            div.innerHTML = html || '';
            div.style['display'] = '';
            div.style['font'] = font;
            var width = div.offsetWidth;
            div.style['display'] = 'none';
            return width;
        }
    })();

    ;(function(){
        var RGBReg = /^rgb(\((\s*\d+\s*\,\s*){2}|a\((\s*\d+\s*\,\s*){3})\s*\d+\s*\)$/
        var SHEXReg = /^\#?[\da-fA-F]{3}$/;
        var HEXReg = /^\#?[\da-fA-F]{6}$/;
        var dReg = /\d+/;
        var toHEX = function(v){
            v = parseInt(v, 10).toString(16);
            return v.length === 1? '0' + v : v;
        }
        var toDecimal = function(v, f){
            return parseInt(v, f || 16);
        }
        var inRange = function (v, min, max) {
            return Math.max(min, Math.min(max, v));
        }

        var Color = function(r, g, b, a){
            if(!(this instanceof Color)) return new Color(r, g, b, a);
            if(r instanceof Color) return r.clone();
            
            var sourceFormat = 10;
            if(g === undefined){
                var ms;
                if(RGBReg.test(r)){
                    ms = r.match(dReg);
                }else if(HEXReg.test(r)){
                    var temp = r.replace('#', '');
                    var i = 0, l = 6;
                    ms = [];
                    for( ;i < l; i += 2){
                        ms.push(temp[i] + temp[i+1]);
                    }
                    sourceFormat = 16;
                }else if(SHEXReg.test(r)){
                    var temp = r.replace('#', '');
                    var i = 0, l = 3;
                    ms = [];
                    for( ;i < l; i++){
                        ms.push(temp[i] + temp[i]);
                    }
                    sourceFormat = 16;
                }else{
                    ms = [];
                }
                r = ms[0];
                g = ms[1];
                b = ms[2];
                a = ms[3];
            }

            this.r = toDecimal(r, sourceFormat) || 0;
            this.g = toDecimal(g, sourceFormat) || 0;
            this.b = toDecimal(b, sourceFormat) || 0;
            this.a = toDecimal(a, sourceFormat) || 1;
        }

        Color.prototype = {
            constructor: Color,
            clone: function(){
                return new Color(this.r, this.g, this.b, this.a);
            },
            red: function(r){
                this.r = r;
                return this;
            },
            green: function(g){
                this.g = g;
                return this;
            },
            blue: function(b){
                this.b = b;
                return this;
            },
            alpha: function(a){
                this.a = a;
                return this;
            },
            toHEX: function(){
                return '#' + toHEX(this.r) + toHEX(this.g) + toHEX(this.b);
            },
            toRGB: function(){
                return tool.replacer('rgb({r}, {g}, {b})', this);
            },
            toRGBA: function(){
                return tool.replacer('rgba({r}, {g}, {b}, {a})', this);
            }
        }

        Color.fix = function(from, to, percentage){
            var fix = function(type){
                return from[type] + (to[type] - from[type]) * percentage;
            }
            return new Color(fix('r'), fix('g'), fix('b'), fix('a'));
        }

        Canvas.color = Color;
    })();

    global.canvas = Canvas;
})(window.XT = window.XT || {});