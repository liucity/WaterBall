;(function (global) {
    var linq = global.linq;
    var tool = global.tool;
    var canvas = global.canvas;
    var isFunction = tool.isFunction;
    var isArray = tool.isArray;
    var extend = tool.extend;
    var each = tool.each;
    
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
    
    var hasBreak = (function(){
        var _reg = /\r/;
        return function(txt){
            return _reg.test(txt);
        }
    })();
    var spaceReg = /\s+/g;
    var breakReg = /\r/g;
    var chineseReg = /.*[\u4e00-\u9fa5]+.*$/;
    var valueColor = function (actual, target) {
        var type = 'normal';
        if(target){
            actual = getNumber(actual);
            target = getNumber(target);
            if(actual >= target){
                type = 'great';
            }else if(actual < target){
                type = 'less';
            }
        }
        switch(type){
            case 'normal': return '#333333';
            case 'great': return '#66C07E';
            case 'less': return '#F47476';
        }
    }
    
    var cache = {
        temp: {
            randomed: 0
        },
        add: function (obj) {
            var id = this.temp.randomed++ +'';
            this.temp[id] = obj;
            return id;
        },
        find: function (id) {
            return this.temp[id];
        }
    };

    var defaults = {
        lang: {
            /* title in card,tip,grouptip */
            'title': '',
            'Share': '● Market Share',
            'ShareChange': '',
            'EI': '● Evolution Index',
            'ActualSales': '● Sales Value(min.)',
            'GrowthRate': '● Y-o-Y Growth%',
            'SalesAch': '● Achievement%',
            'CPADataSource': 'Data Source: CPA, ',
            'ShareNote': '(Y-o-Y Share Change)',
            'HPDataSource': 'Data Source:\rTargeted Hospitals&Pharmacies',
            'IMSCHPADataSource': 'Data Source: IMS CHPA, ',

            /* column & tooltip in table */
            'ActualRep': '● Sales Rep#',
            'ActualRep_TipType': '',
            'ActualRep_TipValue': 'Sales Rep#',
            'ActiveRate': '● Existed Rep%',
            'TurnoverRate': '● Turnover%',
            'TurnoverRate_TipType': '',
            'TurnoverRate_TipVoluntaryTurnover_unwanted': 'Voluntary Turnover%\r(unwanted leave)',
            'TurnoverRate_TipVoluntaryTurnover_wanted': 'Involuntary Turnover%\r(wanted leave)',
            'DaysInField': '● Days in Field',
            'CallsPerDay': '● Full Calls per Day',
            'Coverage': '● Physician Coverage%',
            'Coverage_TipType': '',
            'Coverage_TipCoverageAll': 'All',
            'Coverage_TipCoverageVH&H': 'VH&H',
            'Frequency': '● Frequency',
            'Frequency_TipType': '',
            'Frequency_TipVH': 'VH',
            'Frequency_TipH': 'H',
            'Frequency_TipM': 'M',
            'ActualRep_TipL': 'L',
            'DigitalCallRate': '● Digital Full Call%',
            'DigitalCallRate_TipType': '',
            'DigitalCallRate_TipValue': 'Digital Full Call%',
            'SubmitSameDay': '● Call Submitted on the Same Day',
            'SubmitSameDay_TipType': '',
            'SubmitSameDay_TipValue': 'Call Submitted on the Same Day%',
            'KeyMessageActualWithoutTarget': '● Quarterly Key Messages\rDelivery (Rep Ach%)',
            'KeyMessageCoverageWithoutTarget': '● Quarterly Key Messages\rCoverage% (Rep Ach%)',
            'KeyMessageDeliveryWithTarget': '● Quarterly Key Messages\rDelivery (Rep Ach%)',
            'KeyMessageCoverageWithTarget': '● Quarterly Key Messages\rCoverage% (Rep Ach%)',
            'KeyMessageCoverageWithTarget_TipType': '',
            'KeyMessageCoverageWithTarget_TipValue': 'Key Message Coverage% (Rep Ach%)',
            'SalesValuePerCall': '● Sales Value per Rep'
        }
    }
    
    var chart = function (dom, items, callback, params) {
        if(!dom || dom.tagName !== 'CANVAS') {
            tool.error('please use canvas element!');
            return false;
        }
        
        if(!dom.dataset.chartID){
            dom.dataset.chartID = cache.add(new canvas({
                dom: dom,
                event: callback
            }));
        }
        
        var _canvas = cache.find(dom.dataset.chartID)
        
        _canvas.height = dom.height;
        _canvas.width = dom.width;
        
        var _items = chart.prototype.getItems(_canvas, items, params);
        
        _canvas.items = _items;
            //console.log(_items);
        _canvas.render = function (opts) {
            var t = opts.time;
            var state = false;
            var hasAnimation;
            var ctx = this.getContext();
            this.clean();
            _items.each(function () {
                hasAnimation = (!params || params.animation !== false) && isFunction(this.animate)
                if(hasAnimation) {
                    ctx.save();
                    state = !!this.animate(_canvas, ctx, t) || state;
                }
                if(isFunction(this.render))  this.render(_canvas, ctx, t);
                if(hasAnimation) {
                    ctx.restore();
                }
            })
            return state;
        }
        
        _canvas.draw();
        return _canvas;
    }
    
    chart.prototype = {
        getItems: function (canvas, items, params) {
            var cht = this;
            var opts = extend({
                w: canvas.width,
                h: canvas.height,
                len: items.length,
                space: 5,
                items: new linq(items),
                canvas: canvas
            }, params);
            var format;
            return opts.items.selectmany(function (item, i) {
                if(isFunction(cht[item.type])){
                    var _items = cht[item.type].call(cht, item, i, opts);
                    if(!linq.isLinq(_items)){
                        if(!isArray(_items)) _items = [_items];
                        _items = new linq(_items);
                    }
                    return _items.selectall().each(function () {
                        this.data = this.data || item;
                        this.index = i;
                    });
                }
            });
        },
        grouptip: function(item, index, options){
            var firstWidth = 150;
            var results = new linq([]);
            var items = options.items.selectmany(function () {
                return this.data;
            });
            
            var defines = new linq([{
                name: '',
                field: 'title',
                type: function (data, x, y, w, h) {
                    return new Label({
                                content: data,
                                align: 'center',
                                animate: false
                            }, x + w / 2, y, w - Border.prototype.radius * 2, h);
                },
                x: function (lw, space, index) {
                    return x + lw * index;
                },
                y: function (lh, space, index) {
                    return lh * 2 + space;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh - space;
                }
            }, {
                name: {
                    content: 'Data Source: CPA, ' + ((options.items.first(function () {
                                        return this.TimePeriod;
                                    }) || {}).TimePeriod  || ''),
                    color: '#8c8fe1',
                    font: '9px Microsoft YaHei'
                },
                field: 'CPADataSource',
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 2.7;
                },
                w: firstWidth,
                h: function (lh, space, index) {
                    return lh - space;
                },
                namefix: function (label, x, y, w, h) {
                    label.x += 11;
                }
            },{
                name: '● Market Share',
                field: 'Share',
                type: function (data, x, y, w, h) {
                    return new Label({
                                color: valueColor(data),
                                content: data,
                                align: 'center',
                                underline: true
                            }, x + w / 2, y, w, h);
                },
                x: function (lw, space, index) {
                    return x + lw * index;
                },
                y: function (lh, space, index) {
                    return space + lh * 3.5;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh - space;
                }
            }, {
                name: {
                    content: '(Y-o-Y Share Change)',
                    font: 'bold 9px Microsoft YaHei',
                    ignoreCheck: true
                },
                field: 'ShareNote',
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 4;
                },
                w: firstWidth,
                h: function (lh, space, index) {
                    return lh - space;
                },
                namefix: function (label, x, y, w, h) {
                    label.x += 8;
                }
            }, {
                name: '',
                field: 'ShareChange',
                type: function (data, x, y, w, h) {
                    var ww = options.items.selectmany(function () {
                        return this.data
                    }).max(function () {
                        return canvas.getTextWidth(Label.prototype.font, this.Share);
                    });
                    return new Arrow({
                                content: data
                            }, x + w - (w - ww) / 4 - Arrow.prototype.w / 2, y);
                },
                x: function (lw, space, index) {
                    return x + lw * index;
                },
                y: function (lh, space, index) {
                    return space + lh * 3.5;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh - space;
                }
            }, {
                name: '● Evolution Index',
                field: 'EI',
                type: function (data, x, y, w, h) {
                    var max = this.max();
                    var _EIT = items.first(function () {
                        return this.EI === data;
                    }).EITarget;
                    var bar = new Bar({}, x + w / 2, y, w / 3, h * getNumber(data) / max);
                    var label = new Label({
                        content: data,
                        align: 'center',
                        color: valueColor(data, '100'),
                        vertical: 'bottom',
                        animation: {
                            start: 500,
                            end: 750
                        }
                    }, x + w / 2, y - h * (Math.max(getNumber(data), getNumber(_EIT))) / max, w / 3, h);
                    var target = new Target(x + w / 2, y, w / 9, h * getNumber(_EIT) / max, { mouseover: null})
                    return [bar, label, data ? target : false];
                },
                x: function (lw, space, index) {
                    return x + lw * index;
                },
                y: function (lh, space, index) {
                    return space + lh * 5.5;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                },
                max: function () {
                    return items.max(function () {
                        return [getNumber(this.EI), getNumber(this.EITarget)];
                    });
                },
                namefix: function (label, x, y, w, h) {
                    label.y -= h / 2;
                }
            }, {
                name: {
                    content: 'Data Source:\rTargeted Hospitals&Pharmacies',
                    color: '#8c8fe1',
                    font: '9px Microsoft YaHei'
                },
                field: 'HPDataSource',
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 6;
                },
                w: firstWidth,
                h: function (lh, space, index) {
                    return lh - space;
                },
                namefix: function (label, x, y, w, h) {
                    label.x += 11;
                }
            }, {
                name: '● Sales Value(' + (item.data && item.data[0].ValueUnit || 'min.') + ')',
                field: 'ActualSales',
                type: function (data, x, y, w, h) {
                    return new Label({
                                color: valueColor(data),//getNumber(data) < 0 ? '#F47476' : '#66C07E',
                                content: data,
                                font: 'bold 15px Microsoft YaHei',
                                align: 'center'
                            }, x + w / 2, y, w, h);
                },
                x: function (lw, space, index) {
                    return x + lw * index;
                },
                y: function (lh, space, index) {
                    return space + lh * 7;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                }
            }, {
                name: '● Y-o-Y Growth%',
                field: 'GrowthRate',
                type: function (data, x, y, w, h) {
                    return new Label({
                        content: data,
                        color: valueColor(data, '0'),
                        align: 'center'
                    }, x + w / 2, y, w, h);
                },
                x: function (lw, space, index) {
                    return x + lw * index;
                },
                y: function (lh, space, index) {
                    return space + lh * 8;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh * 2.5;
                },
                namefix: function (label, x, y, w, h) {
                    //label.y -= h / 2;
                }
            }, {
                name: '● Achievement%',
                field: 'SalesAch',
                type: function (data, x, y, w, h) {
                   return new Label({
                                color: valueColor(data, '100%'),
                                content: data,
                                align: 'center'
                            }, x + w / 2, y, w, h);
                },
                x: function (lw, space, index) {
                    return x + lw * index;
                },
                y: function (lh, space, index) {
                    return space + lh * 9;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                }
            }]);
            
            var decayCount = 2;
            var len = options.items.sum(function (d, i) {
                return d.data.length < decayCount ? decayCount : d.data.length;
            });
            var startIndex = options.items.where(function (d, i) {
                return i < index;
            }).sum(function (d, i) {
                return d.data.length < decayCount ? decayCount : d.data.length;
            });
            var px = (options.w - options.space * 2 - firstWidth) / len;
            var py = (options.h - options.space * 2) / 10;
            var x = firstWidth + options.space * 2 + px * startIndex;
            
            var _border = new Border('tip', 
                x, 
                options.space, 
                (item.data.length < decayCount ? decayCount : item.data.length) * px - options.space, 
                options.h - options.space * 2);
            var _label = new Label({
                    content: item.title,
                    animate: false,
                    vertical: 'top'
                }, 
                x + _border.radius / 2,
                options.space + (py - options.space) * 0.5,
                (item.data.length < decayCount ? decayCount : item.data.length) * px - _border.radius,
                canvas.getTextHeight(Label.prototype.font) * 2 || py);
            results.add(_border, _label);
            
            px = (item.data.length < decayCount ? decayCount : 1) * px;
                
            var lang = defaults.lang || {};
            var enabledDefines = new linq(options.defines || defines.select(function(){ return this.field; })), 
                enabledDefine;
            defines.each(function(){
                enabledDefine = enabledDefines.first(function(_d){
                    return define.field === (_d && _d.field || _d);
                });

                if(!tool.isPlainObject(this.name)) this.name = { content: this.name };
                this.name.content = enabledDefine && enabledDefine.name || lang[this.field] || this.name.text;
            })
                
            new linq(item.data).selectmany(function(data, i){
                results = results.concat(defines.selectmany(function (define) {
                    if(!this.type) return;
                    var result = this.type(data[this.field], 
                        isFunction(this.x) ? this.x(px, options.space, i) : this.x, 
                        isFunction(this.y) ? this.y(py, options.space, i) : this.y, 
                        isFunction(this.w) ? this.w(px, options.space, i) : this.w, 
                        isFunction(this.h) ? this.h(py, options.space, i) : this.h);
                        
                    if(!isArray(result)) result = [result];
                    return new linq(result).each(function () {
                        this.define = define;
                        this.data = data;
                        this.groupData = item;
                    });
                }));
            });
            
            if(!index){
                defines.each(function () {
                    if (this.ignoreName) return;
                    var _x = options.space / 4;
                    this.y = isFunction(this.y) ? this.y(py, options.space) : this.y;
                    this.h = isFunction(this.h) ? this.h(py, options.space) : this.h;
                    var result = new Label(extend({
                                define: extend({}, this, { field: '_name'}),
                                animate: false
                            }, this.name), 
                            _x, this.y, this.w, this.h
                        );
                        
                    if(isFunction(this.namefix)) this.namefix(result, options.space, this.y, firstWidth, this.h);
                    results.add(result);
                });
            }
            
            return results;
        },
        tip: function (item, index, options) {
            var firstWidth = 150;
            var px = (options.w - options.space * 2 - firstWidth) / options.len;
            var x = options.space * 2 + firstWidth + px * index;
            var py = (options.h - options.space * 2) / 10;
            var y =  options.space;
            var results;
            
            var defines = new linq([{
                field: 'border',
                type: function (data, x, y, w, h) {
                    return new Border('tip', x, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space;
                },
                w: function (lw, space, index) {
                    return lw - space;
                },
                h: function (lh, space, index) {
                    return options.h - options.space * 2;
                }
            },{
                name: '',
                field: 'title',
                type: function (data, x, y, w, h) {
                    var border = defines.first(function () {
                        return this.field === 'border';
                    });
                    
                    var label = new Label({
                                content: data,
                                align: 'center',
                                animate: false,
                                vertical: 'top'
                            }, x + w / 2, y, w - border.type().radius * 2, canvas.getTextHeight(Label.prototype.font) * 2);
                    
                    return label;
                },
                x: x,
                y: function (lh, space, index) {
                    return lh / 2 + space;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                }
            }, {
                name: {
                    content: 'Data Source: CPA, ' + ((options.items.first(function () {
                                            return this.TimePeriod;
                                        }) || {}).TimePeriod  || ''),
                    color: '#8c8fe1',
                    font: '9px Microsoft YaHei'
                },
                field: 'CPADataSource',
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 1.7;
                },
                w: firstWidth,
                h: function (lh, space, index) {
                    return lh - space;
                },
                namefix: function (label, x, y, w, h) {
                    label.x += 11;
                }
            }, {
                name: '● Market Share',
                field: 'Share',
                type: function (data, x, y, w, h) {
                    return new Label({
                                color: valueColor(data),
                                content: data,
                                align: 'center',
                                underline: true
                            }, x + w / 2, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 2.5;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh - space;
                }
            }, {
                name: {
                    content: '(Y-o-Y Share Change)',
                    font: 'bold 9px Microsoft YaHei',
                    ignoreCheck: true
                },
                field: 'ShareNote',
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 3;
                },
                w: firstWidth,
                h: function (lh, space, index) {
                    return lh - space;
                },
                namefix: function (label, x, y, w, h) {
                    label.x += 8;
                }
            }, {
                name: '',
                field: 'ShareChange',
                type: function (data, x, y, w, h) {
                    var ww = options.items.max(function () {
                        return canvas.getTextWidth(Label.prototype.font, this.Share);
                    });
                    return new Arrow({
                                content: data
                            }, x + w - (w - ww) / 4 - Arrow.prototype.w / 2, y);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 2.5;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh - space;
                }
            }, {
                name: '● Evolution Index',
                field: 'EI',
                type: function (data, x, y, w, h) {
                    var max = this.max();
                    var bar = new Bar({}, x + w / 2, y, w / 3, h * getNumber(data) / max);
                    var label = new Label({
                        content: data,
                        align: 'center',
                        color: valueColor(item.EI, '100'),
                        vertical: 'bottom',
                        animation: {
                            start: 500,
                            end: 750
                        }
                    }, x + w / 2, y - h * (Math.max(getNumber(data), getNumber(item.EITarget))) / max, w / 3, h);
                    var target = new Target(x + w / 2, y, w / 9, h * getNumber(item.EITarget) / max, { mouseover: null});
                    return [bar, label, data ? target : null];
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 5;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                },
                max: function () {
                    return options.items.max(function () {
                        return [getNumber(this.EI), getNumber(this.EITarget)];
                    });
                },
                namefix: function (label, x, y, w, h) {
                    label.y -= h / 2;
                }
            }, {
                name: {
                    content: 'Data Source:\rTargeted Hospitals&Pharmacies',
                    color: '#8c8fe1',
                    font: '9px Microsoft YaHei'
                },
                field: 'HPDataSource',
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 6;
                },
                w: firstWidth,
                h: function (lh, space, index) {
                    return lh - space;
                },
                namefix: function (label, x, y, w, h) {
                    label.x += 11;
                }
            }, {
                name: '● Sales Value(' + (item.ValueUnit || 'min.') + ')',
                field: 'ActualSales',
                type: function (data, x, y, w, h) {
                    return new Label({
                                color: valueColor(data), //getNumber(data) < 0 ? '#F47476' : '#66C07E',
                                content: data,
                                font: 'bold 15px Microsoft YaHei',
                                align: 'center'
                            }, x + w / 2, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 7;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                }
            }, {
                name: '● Y-o-Y Growth%',
                field: 'GrowthRate',
                type: function (data, x, y, w, h) {
                    return new Label({
                        content: data,
                        color: valueColor(data, '0'),
                        align: 'center'
                    }, x + w / 2, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 8;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh * 2.5;
                },
                namefix: function (label, x, y, w, h) {
                    //label.y -= h / 2;
                }
            }, {
                name: '● Achievement%',
                field: 'SalesAch',
                type: function (data, x, y, w, h) {
                   return new Label({
                                color: valueColor(data, '100'),
                                content: data,
                                align: 'center'
                            }, x + w / 2, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 9;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                }
            }]);
            
            var _x = 0, _y = 0;
            var lang = defaults.lang || {};
            var enabledDefines = new linq(options.defines || defines.select(function(){ return this.field; })), 
                enabledDefine;
            results = defines.selectmany(function (define) {
                enabledDefine = enabledDefines.first(function(_d){
                    return define.field === (_d && _d.field || _d);
                });
                
                if(!tool.isPlainObject(this.name)) this.name = { content: this.name };
                this.name.content = enabledDefine && enabledDefine.name || lang[this.field] || this.name.text;
                this.x = isFunction(this.x) ? this.x(px, options.space, index) : this.x;
                this.y = isFunction(this.y) ? this.y(py, options.space, index) : this.y;
                this.w = isFunction(this.w) ? this.w(px, options.space, index) : this.w;
                this.h = isFunction(this.h) ? this.h(py, options.space, index) : this.h;
                if(!this.x){
                    this.x = _x;
                    _x += this.w + options.space;
                }
                if(!this.y){
                    this.y = _y;
                    _y += this.h + options.space;
                }
                return this;
            }).selectmany(function (define) {
                if(!this.type) return;
                var result = this.type(item[this.field], this.x, this.y, this.w, this.h);
                
                if(!isArray(result)) result = [result];
                return new linq(result).each(function () {
                    this.define = define;
                });
            });
            
            if(!index){
                defines.each(function () {
                    if (this.ignoreName) return;
                    var _x = options.space / 4;
                    var result = new Label(extend({
                                define: extend({}, this, { field: '_name'}),
                                animate: false
                            }, this.name), 
                            _x, this.y, this.w, this.h
                        );
                        
                    if(isFunction(this.namefix)) this.namefix(result, this.x, this.y, this.w, this.h);
                    results.add(result);
                });
                
            }
            
            return results;
        },
        card: function (item, index, options) {
            var firstWidth = 150;
            var px = (options.w - options.space * 2 - firstWidth) / options.len;
            var x = options.space * 2 + firstWidth + px * index;
            var py = (options.h - options.space * 2) / 10;
            var y =  options.space;
            var results;
            
            var defines = new linq([{
                field: 'border',
                type: function (data, x, y, w, h) {
                    return new Border('card', x, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space;
                },
                w: function (lw, space, index) {
                    return lw - space;
                },
                h: function (lh, space, index) {
                    return options.h - options.space * 2;
                }
            },{
                name: '',
                field: 'title',
                type: function (data, x, y, w, h) {
                    var border = defines.first(function () {
                        return this.field === 'border';
                    });
                    
                    var label = new Label({
                                content: data,
                                align: 'center',
                                animate: false,
                                vertical: 'top'
                            }, x + w / 2, y, w - border.type().radius * 2, canvas.getTextHeight(Label.prototype.font) * 2);
                    
                    return label;
                },
                x: x,
                y: function (lh, space, index) {
                    return lh / 2 + space;
                },
                w: function (lw, space, index) {
                    return lw * 3 / 4;
                },
                h: function (lh, space, index) {
                    return lh - space;
                }
            },{
                name: {
                    content: 'Data Source: IMS CHPA, ' + ((options.items.first(function () {
                                        return this.TimePeriod;
                                    }) || {}).TimePeriod  || ''),
                    color: '#8c8fe1',
                    font: '9px Microsoft YaHei',
                    ignoreCheck: true
                },
                field: 'IMSCHPADataSource',
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 1.7;
                },
                w: firstWidth,
                h: function (lh, space, index) {
                    return lh - space;
                },
                namefix: function (label, x, y, w, h) {
                    label.x += 11;
                }
            }, {
                name: '● Market Share',
                field: 'Share',
                type: function (data, x, y, w, h) {
                    return new Label({
                                color: valueColor(data),
                                content: data,
                                align: 'center',
                                underline: true
                            }, x + w / 2, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 2.5;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh - space;
                }
            }, {
                name: {
                    content: '(Y-o-Y Share Change)',
                    font: 'bold 9px Microsoft YaHei',
                    ignoreCheck: true
                },
                field: 'ShareNote',
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 3;
                },
                w: firstWidth,
                h: function (lh, space, index) {
                    return lh - space;
                },
                namefix: function (label, x, y, w, h) {
                    label.x += 8;
                }
            }, {
                name: '',
                field: 'ShareChange',
                type: function (data, x, y, w, h) {
                    var ww = options.items.max(function () {
                        return canvas.getTextWidth(Label.prototype.font, this.Share);
                    });
                    return new Arrow({
                                content: data
                            }, x + w - (w - ww) / 4 - Arrow.prototype.w / 2, y);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 2.5;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh - space;
                }
            }, {
                name: '● Evolution Index',
                field: 'EI',
                type: function (data, x, y, w, h) {
                    var max = this.max();
                    var bar = new Bar({}, x + w / 2, y, w / 3, h * getNumber(data) / max);
                    var label = new Label({
                        content: data,
                        align: 'center',
                        color: valueColor(item.EI, '100'),
                        vertical: 'bottom',
                        animation: {
                            start: 500,
                            end: 750
                        }
                    }, x + w / 2, y - h * (Math.max(getNumber(data), getNumber(item.EITarget))) / max, w / 3, h);
                    var target = new Target(x + w / 2, y, w / 9, h * getNumber(item.EITarget) / max, { mouseover: null});
                    
                    return [bar, label, data ? target : null];
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 5;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                },
                max: function () {
                    return options.items.max(function () {
                        return [getNumber(this.EI), getNumber(this.EITarget)];
                    });
                },
                namefix: function (label, x, y, w, h) {
                    label.y -= h / 2;
                }
            }, {
                name: {
                    content: 'Data Source:\rTargeted Hospitals&Pharmacies',
                    color: '#8c8fe1',
                    font: '9px Microsoft YaHei'
                },
                field: 'HPDataSource',
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 6;
                },
                w: firstWidth,
                h: function (lh, space, index) {
                    return lh - space;
                },
                namefix: function (label, x, y, w, h) {
                    label.x += 11;
                }
            }, {
                name: '● Sales Value(' + (item.ValueUnit || 'min.') + ')',
                field: 'ActualSales',
                type: function (data, x, y, w, h) {
                    return new Label({
                                color: valueColor(data),//getNumber(data) < 0 ? '#F47476' : '#66C07E',
                                content: data,
                                font: 'bold 15px Microsoft YaHei',
                                align: 'center'
                            }, x + w / 2, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 7;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                }
            }, {
                name: '● Y-o-Y Growth%',
                field: 'GrowthRate',
                type: function (data, x, y, w, h) {
                    return new Label({
                        content: data,
                        color: valueColor(data, '0'),
                        align: 'center'
                    }, x + w / 2, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 8;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh * 2.5;
                },
                namefix: function (label, x, y, w, h) {
                    //label.y -= h / 2;
                }
            }, {
                name: '● Achievement%',
                field: 'SalesAch',
                type: function (data, x, y, w, h) {
                   return new Label({
                                color: valueColor(data, '100'),//getNumber(data) < 0 ? '#F47476' : '#66C07E',
                                content: data,
                                align: 'center'
                            }, x + w / 2, y, w, h);
                },
                x: x,
                y: function (lh, space, index) {
                    return space + lh * 9;
                },
                w: function (lw, space, index) {
                    return lw;
                },
                h: function (lh, space, index) {
                    return lh;
                }
            }]);
            
            var _x = 0, _y = 0;
            var lang = defaults.lang || {};
            var enabledDefines = new linq(options.defines || defines.select(function(){ return this.field; })), 
                enabledDefine;
            results = defines.selectmany(function (define) {
                enabledDefine = enabledDefines.first(function(_d){
                    return define.field === (_d && _d.field || _d);
                });
                
                if(!tool.isPlainObject(this.name)) this.name = { content: this.name };
                this.name.content = enabledDefine && enabledDefine.name || lang[this.field] || this.name.text;
                this.x = isFunction(this.x) ? this.x(px, options.space, index) : this.x;
                this.y = isFunction(this.y) ? this.y(py, options.space, index) : this.y;
                this.w = isFunction(this.w) ? this.w(px, options.space, index) : this.w;
                this.h = isFunction(this.h) ? this.h(py, options.space, index) : this.h;
                if(!this.x){
                    this.x = _x;
                    _x += this.w + options.space;
                }
                if(!this.y){
                    this.y = _y;
                    _y += this.h + options.space;
                }
                return this;
            }).selectmany(function (define) {
                if(!this.type) return;
                var result = this.type(item[this.field], this.x, this.y, this.w, this.h);
                
                if(!isArray(result)) result = [result];
                return new linq(result).each(function () {
                    this.define = define;
                });
            });
            
            if(!index){
                defines.each(function () {
                    if (this.ignoreName || this.name) return;
                    var _x = options.space / 4;
                    var _title = new Label(extend({
                                define: extend({}, this, { field: '_name'}),
                                animate: false
                            }, this.name), 
                            _x, this.y, this.w, this.h
                        );
                        
                    if(isFunction(this.namefix)) this.namefix(_title, this.x, this.y, this.w, this.h);
                    results.add(_title);
                });
            }
            
            return results;
        },
        table: function (item, index, options) {
            var px = (options.w - options.space) / 9;
            var x = options.space;
            var py = (options.h - options.space * 2) / (options.len + 1);
            var y =  options.space + py * (index + 1);
            var salesForceWidth = 160;
            var results;
            
            var defines = new linq([{
                name: '● Sales Rep#',
                field: 'ActualRep',
                type: function (data, x, y, w, h) {
                    var max = this.max();
                    var lw = Math.min(options.items.max(function () {
                        return canvas.getTextWidth(Label.prototype.font, this.title) + options.space * 2;
                    }), salesForceWidth / 5 * 3);
                    var mouseover = function (_canvas) {
                            ToolTip(_canvas, {
                                defines: [{
                                    name: '',
                                    field: 'ActualRep_TipType'
                                }, {
                                    name: 'Sales Rep#',
                                    field: 'ActualRep_TipValue'
                                }],
                                datas: [{
                                    ActualRep_TipType: 'Actual',
                                    ActualRep_TipValue: item.ActualRep
                                },{
                                    ActualRep_TipType: 'Budget',
                                    ActualRep_TipValue: item.TargetRep
                                }]
                            }, this.x + this.w / 2, this.y);
                        };
                    return [new Label({
                                content: item.title,
                                align: 'right',
                                animate: false
                            }, x + lw - options.space, y, lw, h),
                            getNumber(item.TargetRep) ? new Bar({
                                layout: 'vertical',
                                type: 'stroke',
                                mouseover: mouseover
                            }, x + lw, y, h / 2, (w - lw) / max * getNumber(item.TargetRep)) : false,
                            getNumber(item.ActualRep) ? new Bar({
                                content: item.ActualRep,
                                layout: 'vertical',
                                mouseover: mouseover
                            }, x + lw, y, h / 3, (w - lw) / max * getNumber(item.ActualRep)) : false];
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: function (lw, space, index) {
                    return salesForceWidth;
                },
                h: function (lh, space, index) {
                    return lh;
                },
                max: function () {
                    return options.items.max(function () {
                        return [getNumber(this.TargetRep), getNumber(this.ActualRep)];
                    });
                },
                namefix: function (label, x, y, w, h) {
                    label.x = options.space + salesForceWidth / 2;
                    label.w = salesForceWidth;
                }
            }, {
                name: '● Existed Rep%',
                field: 'ActiveRate',
                type: function (data, x, y, w, h) {
                    return new Label({
                                    content: data,
                                    color: valueColor(data),
                                    align: 'center'
                                }, x + w / 2, y, w, h)
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 85,
                h: function (lh, space, index) {
                    return lh / 2;
                },
                namefix: function (label, x, y, w, h) {
                    label.ignoreCheck = true;
                }
            }, {
                name: '● Turnover%',
                field: 'TurnoverRate',
                type: function (data, x, y, w, h) {
                    return new Label({
                                    content: data,
                                    color: valueColor(data),
                                    align: 'center',
                                    underline: true,
                                    mouseover: function (_canvas) {
                                        ToolTip(_canvas, {
                                            defines: [{
                                                name: '',
                                                field: 'TurnoverRate_TipType'
                                            }, {
                                                name: 'Voluntary Turnover%\r(unwanted leave)',
                                                field: 'TurnoverRate_TipVoluntaryTurnover_unwanted'
                                            }, {
                                                name: 'Involuntary Turnover%\r(wanted leave)',
                                                field: 'TurnoverRate_TipVoluntaryTurnover_wanted'
                                            }],
                                            datas: [{
                                                TurnoverRate_TipType: 'Turnover%',
                                                TurnoverRate_TipVoluntaryTurnover_unwanted: item.VoluntaryTurnover_unwanted,
                                                TurnoverRate_TipVoluntaryTurnover_wanted: item.VoluntaryTurnover_wanted
                                            }]
                                        }, this.x, this.y);
                                    }
                                }, x + w / 2, y, w, h)
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 90,
                h: function (lh, space, index) {
                    return lh / 2;
                }
            }, {
                name: '● Days in Field',
                field: 'DaysInField',
                type: function (data, x, y, w, h) {
                    var colorMap = {
                        r: '#F47476',
                        R: '#F47476',
                        g: '#66C07E',
                        G: '#66C07E',
                        b: '#333333',
                        B: '#333333'
                    }
                    
                    return [new Label({
                                content: data,
                                color: colorMap[item.DaysInFieldFlag],
                                align: 'right'
                            }, x + w / 2, y, w, h), new Label({
                                content: item.TargetDays ? '/' + item.TargetDays : '',
                                color: valueColor(data),
                                align: 'left',
                                animate: false
                            }, x + w / 2, y, w, h)];
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 65,
                h: function (lh, space, index) {
                    return lh / 2;
                }
            }, {
                name: '● Full Calls per Day',
                field: 'CallsPerDay',
                type: function (data, x, y, w, h) {
                    return [new Label({
                                content: data,
                                color: valueColor(data, item.TargetCallsPerDay),
                                align: 'right'
                            }, x + w / 2, y, w, h), new Label({
                                content: item.TargetCallsPerDay ? '/' + item.TargetCallsPerDay : '',
                                color: valueColor(data),
                                align: 'left',
                                animate: false
                            }, x + w / 2, y, w, h)];
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 65,
                h: function (lh, space, index) {
                    return lh / 2;
                }
            }, {
                name: '● Physician Coverage%',
                field: 'Coverage',
                type: function (data, x, y, w, h) {
                    var temp = data.length, max, min, space = this.space, _w = (w - space) / temp;
                    
                    data = new linq(item.Coverage);
                    max = data.max(function (d, i) {
                        return [getNumber(item.Coverage[i]), getNumber(item.TargetCoverage[i])];
                    });
                    min = data.min(function (d, i) {
                        return [getNumber(item.Coverage[i]), getNumber(item.TargetCoverage[i])];
                    });
                    max += max /5;
                    max = max || 1;
                    
                    var mouseover = function (_canvas) {
                        ToolTip(_canvas, {
                            defines: [{
                                name: '',
                                field: 'Coverage_TipType'
                            }, {
                                name: 'All',
                                field: 'Coverage_TipCoverageAll'
                            }, {
                                name: 'VH&H',
                                field: 'Coverage_TipCoverageVH&H'
                            }],
                            datas: [{
                                Coverage_TipType: 'Actual',
                                Coverage_TipCoverageAll: item.Coverage[0],
                                'Coverage_TipCoverageVH&H': item.Coverage[1]
                            // }, {
                            //     Type: 'Target',
                            //     CoverageAll: item.TargetCoverage[0],
                            //     'CoverageVH&H': item.TargetCoverage[1]
                            }]
                        }, this.x, this.y);
                    };
                    
                    var fData = new linq(item.Coverage).selectmany(function (d, i) {
                         return [new Bar({
                                    color: 'rgba(175, 216, 248, ' + (1 - 1 / temp * i) + ')',
                                    mouseover: mouseover
                                }, x + space + _w * i + _w / 2, y + h / 2, _w - space, h * getNumber(d) / max),
                                new Label({
                                    content: d,
                                    align: 'center',
                                    font: '8px Microsoft Hei',
                                    color: valueColor(d),
                                    animation: {
                                        start: 500,
                                        end: 750
                                    }
                                }, x + space + _w * i + _w / 2, y + h / 2 - h * Math.max(getNumber(d), getNumber(item.TargetCoverage[i])) / max - space, w, h)];
                    });
                    
                    var tfData = new linq(item.TargetCoverage).selectmany(function (d, i) {
                        return d ? new Target(x + space + _w * i + _w / 2, y + h / 2, (_w - space) / 2, h * getNumber(d) / max, { 
                            mouseover: mouseover
                        }) : false;
                    });
                    
                    return fData.concat(tfData);
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 90,
                h: function (lh, space, index) {
                    return lh / 2;
                },
                space: 5
            }, {
                name: '● Frequency',
                field: 'Frequency',
                type: function (data, x, y, w, h) {
                    var temp = data.length, max, min, space = this.space, _w = (w - space) / temp;
                    data = new linq(item.Frequency);
                    max = data.max(function (d, i) {
                        return [getNumber(item.Frequency[i]), getNumber(item.TagetFrequency[i])];
                    });
                    max += max / 5;
                    max = max || 1;
                    min = data.min(function (d, i) {
                        return [getNumber(item.Frequency[i]), getNumber(item.TagetFrequency[i])];
                    });
                    var mouseover = function (_canvas) {
                        ToolTip(_canvas, {
                            defines: [{
                                name: ' ',
                                field: 'Frequency_TipType'
                            }, {
                                name: 'VH',
                                field: 'Frequency_TipVH'
                            }, {
                                name: 'H',
                                field: 'Frequency_TipH'
                            }, {
                                name: 'M',
                                field: 'Frequency_TipM'
                            }, {
                                name: 'L',
                                field: 'Frequency_TipL'
                            }],
                            datas: [{
                                Frequency_TipType: 'Actual',
                                Frequency_TipVH: item.Frequency[0],
                                Frequency_TipH: item.Frequency[1],
                                Frequency_TipM: item.Frequency[2],
                                Frequency_TipL: item.Frequency[3]
                            // }, {
                            //     Type: 'Target',
                            //     VH: item.TagetFrequency[0],
                            //     H: item.TagetFrequency[1],
                            //     M: item.TagetFrequency[2],
                            //     L: item.TagetFrequency[3]
                            }]
                        }, this.x, this.y);
                    }
                    var fData = new linq(item.Frequency).selectmany(function (d, i) {
                        return [new Bar({
                                    color: 'rgba(175, 216, 248, ' + (1 - 1 / temp * i) + ')',
                                    mouseover: mouseover
                                }, x + space + _w * i + _w / 2, y + h / 2, _w - space, h * getNumber(d) / max),
                                new Label({
                                    content: d,
                                    align: 'center',
                                    font: '8px Microsoft Hei',
                                    color: valueColor(d),
                                    animation: {
                                        start: 500,
                                        end: 750
                                    }
                                }, x + space + _w * i + _w / 2, y + h / 2 - h * Math.max(getNumber(d), getNumber(item.TagetFrequency[i])) / max - space, w, h)];
                    });
                    var tfData = new linq(item.TagetFrequency).selectmany(function (d, i) {
                        return d ? new Target(x + space + _w * i + _w / 2, y + h / 2, (_w - space) / 2, h * getNumber(d) / max, { 
                            mouseover: mouseover
                        }) : false;
                    });
                    
                    return fData.concat(tfData);
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 110,
                h: function (lh, space, index) {
                    return lh / 2;
                },
                space: options.space
            }, {
                name: '● Digital Full Call%',
                field: 'DigitalCallRate',
                type: function (data, x, y, w, h) {
                    var max = this.max();
                    var mouseover = function (_canvas) {
                        ToolTip(_canvas, {
                            defines: [{
                                name: '',
                                field: 'DigitalCallRate_TipType'
                            }, {
                                name: 'Digital Full Call%',
                                field: 'DigitalCallRate_TipValue'
                            }],
                            datas: [{
                                DigitalCallRate_TipType: 'Actual',
                                DigitalCallRate_TipValue: item.DigitalCallRate
                            // },{
                            //     Type: 'Target',
                            //     Value: item.TargetDigitalCallRate
                            }]
                        }, this.x + this.w / 2, this.y);
                    };
                    return [new Bar({
                                layout: 'vertical',
                                type: 'stroke',
                                mouseover: mouseover
                            }, x, y, h / 2, w / max * getNumber(item.TargetDigitalCallRate)), new Bar({
                                content: data,
                                layout: 'vertical',
                                mouseover: mouseover
                            }, x, y, h / 3, w / max * getNumber(data))];
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 120,
                h: function (lh, space, index) {
                    return lh;
                },
                max: function () {
                    return options.items.max(function () {
                        return [getNumber(this.DigitalCallRate), getNumber(this.TargetDigitalCallRate)];
                    });
                }
            }, {
                name: '● Call Submitted on the Same Day',
                field: 'SubmitSameDay',
                type: function (data, x, y, w, h) {
                    var max = this.max();
                    var mouseover = function (_canvas) {
                        ToolTip(_canvas, {
                            defines: [{
                                name: '',
                                field: 'SubmitSameDay_TipType'
                            }, {
                                name: 'Call Submitted on the Same Day%',
                                field: 'SubmitSameDay_TipValue'
                            }],
                            datas: [{
                                SubmitSameDay_TipType: 'Actual',
                                SubmitSameDay_TipValue: item.SubmitSameDay
                            // },{
                            //     Type: 'Target',
                            //     Value: item.TargetSubmitSameDay
                            }]
                        }, this.x + this.w / 2, this.y);
                    };
                    return [new Bar({
                                layout: 'vertical',
                                type: 'stroke',
                                mouseover: mouseover
                            }, x, y, h / 2, w / max * getNumber(item.TargetSubmitSameDay)), 
                            new Bar({
                                content: data,
                                layout: 'vertical',
                                mouseover: mouseover
                            }, x, y, h / 3, w / max * getNumber(data))]
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 120,
                h: function (lh, space, index) {
                    return lh;
                },
                max: function () {
                    return options.items.max(function () {
                        return [getNumber(this['SubmitSameDay']), getNumber(this['TargetSubmitSameDay'])];
                    })
                }
            }, {
                name: '● Quarterly Key Messages\rDelivery (Rep Ach%)',
                field: 'KeyMessageActualWithoutTarget',
                type: function (data, x, y, w, h) {
                    return new Label({
                                content: item.KeyMessageActual,
                                color: '#90B761',
                                align: 'center'
                            }, x + w / 2, y, w, h);
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 165,
                h: function (lh, space, index) {
                    return lh / 2;
                }
            }, {
                name: '● Quarterly Key Messages\rCoverage% (Rep Ach%)',
                field: 'KeyMessageCoverageWithoutTarget',
                type: function (data, x, y, w, h) {
                    return new Bar({
                                content: item.KeyMessageCoverage,
                                layout: 'vertical'
                            }, x, y, h / 2, w / this.max() * getNumber(item.KeyMessageCoverage));
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 165,
                h: function (lh, space, index) {
                    return lh;
                },
                max: function () {
                    return options.items.max(function () {
                        return getNumber(this.KeyMessageCoverage);
                    });
                }
            }, {
                name: '● Quarterly Key Messages\rDelivery (Rep Ach%)',
                field: 'KeyMessageDeliveryWithTarget',
                type: function (data, x, y, w, h) {
                    return [new Label({
                                content: item.KeyMessageActual,
                                color: valueColor(item.KeyMessageActual, item.KeyMessageTarget),
                                align: item.KeyMessageTarget ?'right' : 'center'
                            }, x + w / 2, y, w, h), new Label({
                                content: item.KeyMessageTarget ? '/' + item.KeyMessageTarget : '',
                                color: valueColor(item.KeyMessageTarget),
                                align: 'left',
                                animate: false
                            }, x + w / 2, y, w, h)];
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 165,
                h: function (lh, space, index) {
                    return lh;
                }
            }, {
                name: '● Quarterly Key Messages\rCoverage% (Rep Ach%)',
                field: 'KeyMessageCoverageWithTarget',
                type: function (data, x, y, w, h) {
                    var showAsLabel = item.KeyMessageCoverageType === 'Label';
                    if(showAsLabel){
                        return new Label({
                            content: item.KeyMessageCoverage,
                            color: valueColor(item.KeyMessageCoverage),
                            align: 'center'
                        }, x + w / 2, y, w, h);
                    }else{
                        var max = this.max();
                        var mouseover = function (_canvas) {
                                ToolTip(_canvas, {
                                    defines: [{
                                        name: '',
                                        field: 'KeyMessageCoverageWithTarget_TipType'
                                    }, {
                                        name: 'Key Message Coverage% (Rep Ach%)',
                                        field: 'KeyMessageCoverageWithTarget_TipValue'
                                    }],
                                    datas: [{
                                        KeyMessageCoverageWithTarget_TipType: 'Actual',
                                        KeyMessageCoverageWithTarget_TipValue: item.KeyMessageCoverage
                                    // },{
                                    //     Type: 'Target',
                                    //     Value: item.KeyMessageCoverageTarget
                                    }]
                                }, this.x + this.w / 2, this.y);
                            };
                        var space = 10;
                        x += space;
                        w -= space * 2;
                        var actualBar = new Bar({
                                        content: item.KeyMessageCoverage,
                                        layout: 'vertical',
                                        mouseover: mouseover
                                    }, x, y, item.KeyMessageTarget ? h / 3 : h / 2, w / max * getNumber(item.KeyMessageCoverage));
                        var targetBar = new Bar({
                                    layout: 'vertical',
                                    type: 'stroke',
                                    mouseover: mouseover 
                                }, x, y, h / 2, w / max * getNumber(item.KeyMessageCoverageTarget));
                                
                        return [targetBar, actualBar];
                    }
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 165,
                h: function (lh, space, index) {
                    return lh;
                },
                max: function () {
                    return options.items.max(function () {
                        return [getNumber(this.KeyMessageCoverage), getNumber(this.KeyMessageCoverageTarget)];
                    });
                }
            }, {
                name: '● Sales Value per Rep',
                field: 'SalesValuePerCall',
                type: function (data, x, y, w, h) {
                    temp = new linq(data).where(function (item) {
                        return item !== null; 
                    });
                    max = temp.max(function (d) {
                        return getNumber(d);
                    });
                    min = temp.min(function (d) {
                        return getNumber(d);
                    });
                    
                    return new Lines(temp.select(function (d, i) {
                        return {
                            x: x + w / (temp.count() - 1) * i,
                            y: y + h / 4 - h / 2 / (max - min) * (getNumber(d) - min),
                            content: d,
                            color: valueColor(d),
                        };
                    }).array());
                },
                y: function (lh, space, index) {
                    return space + lh * (index + 1);
                },
                w: 130,
                h: function (lh, space, index) {
                    return lh;
                }
            }]);
            
            var _x = 0, _y = 0;
            var lang = defaults.lang || {};
            var enabledDefines = new linq(options.defines || defines.select(function(){ return this.field; })), 
                enabledDefine;
            results = defines.selectmany(function (define) {
                enabledDefine = enabledDefines.first(function(_d){
                    return define.field === (_d && _d.field || _d);
                });
                if(!enabledDefine) return;

                this.name = enabledDefine && enabledDefine.name || lang[this.field] || this.name && this.name.text || this.name;
                this.x = isFunction(this.x) ? this.x(px, options.space, index) : this.x;
                this.y = isFunction(this.y) ? this.y(py, options.space, index) : this.y;
                this.w = isFunction(this.w) ? this.w(px, options.space, index) : this.w;
                this.h = isFunction(this.h) ? this.h(py, options.space, index) : this.h;
                if(!this.x){
                    this.x = _x;
                    _x += this.w + options.space;
                }
                if(!this.y){
                    this.y = _y;
                    _y += this.h + options.space;
                }
                return this;
            }).selectmany(function (define) {
                var result = this.type(item[this.field], this.x, this.y, this.w, this.h);
                
                if(!isArray(result)) result = [result];
                return new linq(result).each(function () {
                    this.define = define;
                });
            });
            
            if(!index){
                defines.each(function () {
                    var _title = new Label({
                                content: this.name,
                                align: 'center',
                                vertical: 'top',
                                define: this,
                                animate: false
                            }, 
                            this.x + this.w / 2, options.space, this.w, canvas.getTextHeight(Label.prototype.font) * 2
                        );
                    if(isFunction(this.namefix)) this.namefix(_title, this.x, this.y, this.w, this.h);
                    results.add(_title);
                })
            }
            
            return results;
        },
        waterball: function (item, index, options) {
            return new WaterBall(options.w / 2, options.h / 2, item.min || 0, item.val || 60, item.max || 100, Math.min(options.w, options.h) / 4 || 50);
        }
    }
    
    
    /*-------------------------------------------------------------------------------------------------------------
        Drawable Item Defination
    */
    var Label = function (content, x, y, w, h) {
        if(!(this instanceof Label)) return new Label(content, x, y);
        
        extend(this, this.initContent(content), {
            x: x,
            y: y,
            w: w,
            h: h
        });

        return this.content === undefined || this.content === null ? [] : this;
    }
    
    Label.prototype = {
        color: '#757171',
        font: 'bold 11px Microsoft YaHei',
        align: 'left',
        vertical: 'middle',
        underline: false,
        ignoreCheck: false,
        animation: {
            start: 100,
            end: 350
        },
        animate: function (_canvas, ctx, t) {
             ctx.globalAlpha= inRange(t - this.animation.start, 0, this.animation.end - this.animation.start) / (this.animation.end - this.animation.start);
             return this.animation.end > t;
        },
        render: function (_canvas) {
            var item = this, opts = {
                font: this.font,
                color: this.color,
                align: this.align,
                vertical: this.vertical
            };
            
            this.init(_canvas);
            //    new Border( 'tip',  this.getFixedX() - this.w / 2, this.y - this.h / 2, this.w, this.h).render(_canvas);
            each(this.content, function () {
                _canvas.text(this.x, this.y, this.content, opts);
                if(this.underline){
                    _canvas.line([{
                        x: this.getFixedX() - this.w / 2, 
                        y: this.y + this.h / 2
                    },{
                        x: this.getFixedX() + this.w / 2, 
                        y: this.y + this.h / 2
                    }]).stroke({
                        color: item.color,
                        lineWidth: 1
                    });
                }
            })
        },
        initContent: function (content) {
            if(content){
                if(tool.isString(content)){
                    content = {
                        content: content
                    };
                }
                return content;
            }
            return {}
        },
        init: function (_canvas) {
            if(!this.inited){
                var item = this;
                var content = this.content + '',
                    hasChinese = chineseReg.test(content),
                    contents = content.split(hasBreak(content) ? breakReg : hasChinese ? '' : spaceReg),
                    ctx = _canvas.getContext(),
                    h = canvas.getTextHeight(this.font),
                    w = this.w,
                    list = new linq([]), temp = '', temp2, len = contents.length, i = 0;
                
                ctx.font = this.font;
                if(this.ignoreCheck){
                    list = new linq([content]);
                } else if(hasBreak(content)){
                    list = new linq(contents);
                }else{
                    while (i < len){
                        temp2 = (temp ? temp + (hasChinese ? '' : ' ') : '') + contents[i];
                        if(temp && w && ctx.measureText(temp2).width > w){
                            list.add(temp);
                            temp = contents[i];
                        }else{
                            temp = temp2;
                        }
                        i++;
                    }
                    
                    if(temp) list.add(temp);
                }
                
                if(!this.h) this.h = h * list.count();
                var visibleItems = list.where(function (c, i) {
                    return h * (i + 1) <= item.h;
                })
                this.y -= (visibleItems.count() - 1) * h / 2;
                this.content = visibleItems.select(function (c, i) {
                    return {
                        content: c,
                        x: item.x,
                        y: item.y + h * i,
                        w: ctx.measureText(c).width,
                        h: h,
                        underline: item.underline,
                        align: item.align,
                        getFixedX: item.getFixedX
                    }
                }).array();
                
                if(this.content.length !== list.count()){
                    var lstC = this.content[this.content.length - 1];
                    lstC.content = lstC.content.substr(0, lstC.content.length - 1) + '...';
                    this.mouseover = function (_canvas) {
                        ToolTip(_canvas, content, this.x + this.w / 2, this.y);
                    };
                }
                
                this.inited = true;
                this.w = list.max(function (c) {
                    return ctx.measureText(c).width;
                });
            }
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
    }
    
    var Bar = function (content, x, y, w, h) {
        if(!(this instanceof Bar)) return new Bar(content, x, y, w, h);
        
        var isVertical = content && content.layout === 'vertical',
            label,
            params;
        
        content = Label.prototype.initContent(content);
        
        label = new Label(extend({
            color: this.color,
            align: 'center',
            animation: {
                start: 500,
                end: 750
            }
        }, content), x, y);
        
        if(isVertical){
            params = {
                x: x,
                y: y - w / 2,
                w: h,
                h: w
            }
            if(canvas.getTextWidth(label.font, label.content) < h){
                label.x = x + h / 2;
            }else{
                label.x = x + h + canvas.getTextWidth(label.font, label.content);
            }
            label.color = '#333';
        }else{
            params = {
                x: x - w / 2,
                y: y - h,
                w: w,
                h: h
            }
            label.x = x;
            label.y = y - h - canvas.getTextHeight(label.font);
        }
        
        extend(this, params, content);
        
        return isArray(label) ? [this] : [this, label];
    }
    
    Bar.prototype = {
        // color: '#AFD8F8',
        color: 'rgb(175, 216, 248)',
        layout: 'horizontal', //'vertical'
        type: 'fill',//stroke
        animation: {
            start: 0,
            end: 500
        },
        animate: function (_canvas, ctx, t) {
            var a = inRange(t - this.animation.start, 0, this.animation.end - this.animation.start) / (this.animation.end - this.animation.start);
            if(this.layout === 'vertical'){
                ctx.translate(this.x, this.y);
                ctx.scale(a, 1);
            }else{
                ctx.translate(this.x, this.y + this.h);
                ctx.scale(1, -a);
            }
             return this.animation.end > t;
        },
        render: function (_canvas, ctx) {
            if(!this.w || !this.h) return;
            var opts = {
                color: this.color,
                lineWidth: 1.5
            };
            _canvas.rect(0, 0, this.w, this.h);
            switch(this.type){
                case 'stroke': _canvas.stroke(opts); break;
                case 'fill': _canvas.fill(opts); break;
            }
        },
        inRange: function (x, y) {
            return this.x < x 
                    && this.x + this.w > x 
                    && this.y < y 
                    && this.y + this.h > y;
        }
    }
    
    var Point = function (content, x, y, r) {
        if(!(this instanceof Point)) return new Point(content, x, y, r);
        
        content = Label.prototype.initContent(content);
        
        extend(this, {
            x: x,
            y: y,
            radius: r || this.radius
        }, content)
        
        return [this, new Label(extend(content, {
            color: '#404040',
            font: 'bold 9px Microsoft YaHei'
        }), x + this.radius + 5, y)];
    }
    
    Point.prototype = {
        color: '#B76F8C',
        radius: 5,
        render: function (_canvas) {
            var opts = {
                color: this.color
            };
            _canvas.point(this.x, this.y, this.radius).stroke(opts).fill(opts);
        },
        inRange: function (x, y) {
            return this.x - this.radius < x 
                    && this.x + this.radius > x 
                    && this.y - this.radius < y 
                    && this.y + this.radius > y;
        }
    }
    
    var Border = function (type, x, y, w, h, params) {
        if(!(this instanceof Border)) return new Border(type, x, y, w, h);
        
        return extend(this, {
            type: type,
            x: x,
            y: y,
            w: w,
            h: h
        }, params);
    }
    
    Border.prototype = {
        color: '#90B761',
        lineWidth: 2,
        radius: 15,
        render: function (_canvas) {
            var bd = this;
            switch(this.type){
                case 'card':
                    var list = [];
                    list.push({ x: this.x, y: this.y });
                    list.push({ x: this.x + this.w / 4 * 3, y: this.y });
                    list.push({ x: this.x + this.w, y: this.y + this.w / 4 });
                    list.push({ x: this.x + this.w, y: this.y + this.h });
                    list.push({ x: this.x, y: this.y + this.h });
                    list.push({ x: this.x, y: this.y });
                    _canvas.line(list).stroke({
                        color: this.color,
                        lineWidth: this.lineWidth
                    });
                    break;
                case 'tip':
                    var ctx =  _canvas.getContext();
                    ctx.beginPath();
                    ctx.arc(bd.x + bd.radius, bd.y + bd.radius, bd.radius, Math.PI, Math.PI * 3 / 2);
                    ctx.lineTo(bd.x + bd.w - bd.radius , bd.y);
                    ctx.arc(bd.x + bd.w - bd.radius, bd.y + bd.radius, bd.radius, - Math.PI / 2, 0);
                    ctx.lineTo(bd.x + bd.w, bd.y + bd.h - bd.radius);
                    ctx.arc(bd.x + bd.w - bd.radius, bd.y + bd.h - bd.radius, bd.radius, 0, Math.PI / 2);
                    ctx.lineTo(bd.x + bd.radius, bd.y + bd.h);
                    ctx.arc(bd.x + bd.radius, bd.y + bd.h - bd.radius, bd.radius, Math.PI / 2, Math.PI);
                    ctx.lineTo(bd.x, bd.y + bd.radius);
                    ctx.lineWidth = bd.lineWidth;
                    ctx.strokeStyle = bd.color;
                    ctx.stroke();
                    break;
            }
        },
        inRange: function (x, y) {
            return this.x < x 
                    && this.x + this.w > x 
                    && this.y < y 
                    && this.y + this.h > y;
        }
    }
    
    var Target = function (x, y, w, h, paras) {
        if(!(this instanceof Target)) return new Target(x, y, w, h);
        
        return extend(this, {
            x: x,
            y: y - h,
            w: w,
            h: h
        }, paras);
    }
    
    Target.prototype = {
        color: '#F6BD0F', 
        lineWidth: 2,
        animation: {
            start: 500,
            end: 750
        },
        animate: function (_canvas, ctx, t) {
             ctx.globalAlpha= inRange(t - this.animation.start, 0, this.animation.end - this.animation.start) / (this.animation.end - this.animation.start);
             return this.animation.end > t;
        },
        render: function (_canvas) {
            var opts = {
                color: this.color,
                lineWidth: this.lineWidth
            };
            _canvas.line([{ 
                x: this.x - this.w / 2, 
                y: this.y 
            }, { 
                x: this.x + this.w / 2, 
                y: this.y 
            }]).stroke(opts);
            _canvas.dashLine([{ 
                x: this.x, 
                y: this.y 
            }, { 
                x: this.x, 
                y: this.y + this.h 
            }]).stroke(opts);
            //_canvas.line([{ x: this.x - this.w / 2, y: this.y + this.h }, { x: this.x + this.w / 2, y: this.y + this.h }], opts);
        },
        inRange: function (x, y) {
            return this.x - this.w / 2 < x 
                    && this.x + this.w / 2 > x 
                    && this.y < y 
                    && this.y + this.h > y;
        },
        mouseover: function (_canvas) {
            ToolTip(_canvas, (this.define.name && this.define.name.content ? this.define.name.content + ': ' : '') + this.data[this.define.field], this.x, this.y);
        }
    }
    
    var Arrow = function (content, x, y) {
        if(!(this instanceof Arrow)) return new Arrow(content, x, y);
        
        var label = new Label(extend({
                color: this.color,
                align: 'center',
                font: '8px Microsoft YaHei',
                animation: {
                    start: 500,
                    end: 750
                }
            }, content), x, y - Arrow.prototype.h * 1.5),
            value = getNumber(label.content),
            isUp = value > 0;
            
        extend(this, {
            x: x,
            y: y - this.h / 2,
            w: this.w,
            h: this.h,
            isflip: !isUp
        })
        if((label.content || '').indexOf('-') > -1){
            label.x -= canvas.getTextWidth(label.font, '-') / 2;
        }
        if(!isUp){
            label.color = this.color = '#F47476';
            label.y += Arrow.prototype.h * 3;
        }
        
        return value ? [this, label] : [];
    }
    
    Arrow.prototype = {
        color: '#66C07E',
        lineWidth: 2,
        w: 8,
        h: 8,
        animation: {
            start: 500,
            end: 750
        },
        animate: function (_canvas, ctx, t) {
             ctx.globalAlpha= inRange(t - this.animation.start, 0, this.animation.end - this.animation.start) / (this.animation.end - this.animation.start);
             return this.animation.end > t;
        },
        render: function (_canvas) {
            var list = [],
                ctx = _canvas.getContext();
            ctx.save();
            ctx.translate(this.x, this.y);
            if(this.isflip) {
                ctx.translate(0, this.h);
                ctx.scale(1, -1);
            }
            list.push({ x: 0, y: 0 });
            list.push({ x: this.w / 2, y: this.h / 2 });
            list.push({ x: this.w / 4, y: this.h / 2 });
            list.push({ x: this.w / 4, y: this.h });
            list.push({ x: - this.w / 4, y: this.h });
            list.push({ x: - this.w / 4, y: this.h / 2 });
            list.push({ x: - this.w / 2, y: this.h / 2 });
            list.push({ x: 0, y: 0 });
            
            _canvas.line(list).stroke({
                color: this.color,
                lineWidth: this.lineWidth
            });
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        },
        inRange: function (x, y) {
            return this.x - this.w / 2 < x 
                    && this.x + this.w / 2 > x 
                    && Math.min(this.y, this.y + this.h) < y 
                    && Math.max(this.y, this.y + this.h) > y;
        }
    }
    
    var DashLine = function (content, x, y, x1, y1) {
        if(!(this instanceof DashLine)) return new DashLine(x, y, w, h);
        
        extend(this, {
            x: x,
            y: y,
            x1: x1,
            y1: y1
        })
        
        content = Label.prototype.initContent(content);
        content.vertical = 'bottom';
        
        return [this, new Label(content, x, y)];
    }
    
    DashLine.prototype = {
        color: '#FFE41E',
        dash: 4,
        lineWidth: 2,
        render: function (_canvas) {
            _canvas.dashLine([
                { x: this.x, y: this.y},
                { x: this.x1, y: this.y1}
            ], {
                dash: this.dash
            }).stroke({
                color: this.color,
                lineWidth: this.lineWidth
            });
        },
        inRange: function (x, y) {
            return Math.min(this.x, this.x1) - this.lineWidth / 2 < x 
                    && Math.max(this.x, this.x1) + this.lineWidth / 2 > x 
                    && Math.min(this.y, this.y1) - this.lineWidth / 2 < y 
                    && Math.max(this.y, this.y1) + this.lineWidth / 2 > y;
        }
    }
    
    var Lines = function (list) {
        if(!(this instanceof Lines)) return new Lines(list);
        
        list = new linq(list).where(function (item) {
            return item !== null
        });
        extend(this, {
            list: list.array()
        });
        
        var lastPoint = list.last();
        
        return lastPoint ? [this, new Label({
                                            content: lastPoint.content,
                                            align: 'right',
                                            color: '#000'
                                        }, lastPoint.x, lastPoint.y - 10)] : this;
    }
    
    Lines.prototype = {
        color: '#FFE41E',
        lineWidth: 2,
        pointSize: 6,
        i: 0,
        animation: {
            start: 0,
            end: 500
        },
        animate: function (_canvas, ctx, t) {
            var list = new linq(this.list);
            var x = list.min(function () { return this.x; });
            var y = list.min(function () { return this.y; }) - 5;
            var w = list.max(function () { return this.x; }) - x;
            var h = list.max(function () { return this.y; }) - y + 10;
            //new Border( 'tip',  x, y, w * a, h).render(_canvas);
            ctx.rect(x, y, w * inRange(t - this.animation.start, 0, this.animation.end) / (this.animation.end - this.animation.start), h);
            ctx.clip();
            return this.animation.end > t;
        },
        render: function (_canvas) {
            var item = this;
            var list = item.list;
            var l = list.length, i, sp, cp, ep;
            //this.init();
            if(!list.length) return;
            var ctx = _canvas.getContext();
            ctx.beginPath();
            switch(2 || item.index % 3){
                case 0:
                    ctx.moveTo(list[0].x, list[0].y);
                    new linq(item.renderList).each(function (group) {
                        ctx.quadraticCurveTo(group[0], group[1], group[2], group[3]);
                    })
                    break;
                case 1:
                    for(i = 1; i < l - 1; i++){
                        sp = ep || list[i - 1];
                        cp = list[i];
                        ep = i === l - 2 ? list[i + 1] : {
                            x: (cp.x + list[i + 1].x) / 2,
                            y: (cp.y + list[i + 1].y) / 2
                        };
                        ctx.moveTo(sp.x, sp.y);
                        ctx.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y);
                    }
                    break;
                case 2:
                    new linq(list).each(function (item, i) {
                        ctx[i ? 'lineTo' : 'moveTo'](item.x, item.y);
                    })
                    break;
            }
            ctx.lineWidth = 2;
            ctx.strokeStyle = item.color;
            ctx.stroke();
        },
        init: function () {
            if(!this.inited){
                this.index = Lines.prototype.i++;
                var renderList = [];
                var list = this.list, i = 2, l = list.length;
                var cx, cy;
                
                if(l > 2){
                    cx = list[1].x * 2 - (list[0].x + list[2].x) / 2;
                    cy = list[1].y * 2 - (list[0].y + list[2].y) / 2;
                    renderList.push([cx, cy, list[2].x, list[2].y]);
                    
                    for(;i < l - 1; i++){
                        cx = list[i].x * 2 - cx;
                        cy = list[i].y * 2 - cy;
                        renderList.push([cx, cy, list[i + 1].x, list[i + 1].y]);
                    }
                }
                
                this.renderList = renderList;
                this.inited = true;
            }
        },
        inRange: function (x, y) {
            var size = this.pointSize;
            return !!new linq(this.list).first(function () {
                return this.x - size < x && this.x + size > x
                       && this.y - size < y && this.y + size > y;
            });
        },
        mouseover: function (_canvas, e) {
            var size = this.pointSize;
            var x = e.offsetX, y = e.offsetY;
            var point = new linq(this.list).first(function () {
                return this.x - size < x && this.x + size > x
                       && this.y - size < y && this.y + size > y;
            });
            if(point){
                var items = new Point({
                    content: point.content,
                    color: '#FFE41E'
                }, point.x, point.y, size);
                
                if(!isArray(items)) items = [items];
                new linq(items).each(function () {
                    this.render(_canvas);
                });
            }
        }
    }

    var WaterBall = function (x, y, min, val, max, radius, params) {
        if(!(this instanceof WaterBall)) return new WaterBall(min, cur, max);
        
        extend(this, {
            x: x,
            y: y,
            min: min || 0,
            val: val || 0,
            max: max || 1,
            radius: radius || 100
        }, params);
        
        return this;
    }
    
    WaterBall.prototype = {
        color: 'rgb(175, 216, 248)',
        borderColor: 'rgb(200, 200, 200)',
        lineWidth: 2,
        animation: {
            start: 0,
            end: 1500
        },
        animate: function (_canvas, ctx, t) {
            //ctx.globalAlpha= inRange(t - this.animation.start, 0, this.animation.end - this.animation.start) / (this.animation.end - this.animation.start);
            return this.animation.end > t;
        },
        render: function (_canvas, ctx, t) {
            var self = this;
            var h = this.val / (this.max - this.min) * this.radius * 2;
            var w = Math.PI / (self.animation.end - self.animation.start) / 2;
            
            _canvas.partial(function(ctx){
                ctx.translate(self.x, self.y);
                ctx.scale(1, -1);
                this.point(0, 0, self.radius)
                    .stroke({
                        lineWidth: self.lineWidth,
                        color: self.borderColor
                    });
                ctx.clip();

                if(self.animation.start < t){
                    this.wave({
                        x: -self.radius - 20,
                        y: h - self.radius
                    }, {
                        x: self.radius + 20,
                        y: h - self.radius
                    }, 5 * Math.cos(w * t), 0.1, -t / 100, h * Math.sin(w * t) - self.radius);
                    ctx.lineTo(self.radius + 20, -self.y);
                    ctx.lineTo(-self.radius - 20, -self.y);
                    ctx.closePath();
                }

                var gradient = this.createRadialGradient(self.radius / 2, -self.radius / 2, 0, self.radius);
                gradient.addColorStop(0, "rgba(197, 227, 250, 0)");
                gradient.addColorStop(0.5, "rgba(197, 227, 250, 0.8)");
                gradient.addColorStop(1, self.color);
                this.fill({
                    color: gradient
                })
            });

            return this.animation.end >= t;
        },
        inRange: function (x, y) {
            return Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2) < Math.pow(this.radius, 2);
        }
    }

    /*-------------------------------------------------------------------------------------------------------------
        Drawable Item Defination End
    */
    
    var Table = function (_canvas, defines, datas, styles) {//define { name: ,field}
        var map = new linq([]);
        var getH,getW,d, max;
        var xspace = 15;
        var lang = defaults.lang || {};
        
        styles = extend({
            font: 'bold 11px Microsoft YaHei'
        }, styles);
        getH = (function () {
            var h = canvas.getTextHeight(styles.font);
            return function (txt) {
                if(hasBreak(txt)){
                    return txt.split(breakReg).length * h;
                }
                return h;
            }
        })();
        getW = (function(){
            var w = canvas.getTextWidth;
            return function (txt) {
                if(hasBreak(txt)){
                    return new linq(txt.split(breakReg)).max(function (t) {
                        return w(styles.font, t);
                    })
                }
                return w(styles.font, txt);
            }
        })();
        
        defines = new linq(defines).each(function (define, index) {
            d = lang[this.field] || this.name;
            map.add({
                content: d,
                w: getW(d),
                h: getH(d),
                row: 0,
                col: index
            });
        })
        
        new linq(datas).each(function (data, dataIndex) {
            defines.each(function (define, index) {
                d = data[this.field];
                map.add({
                    content: d,
                    w: getW(d),
                    h: getH(d),
                    row: dataIndex + 1,
                    col: index
                });
            })
        })
        
        d = 0;
        var rows = map.group(function () {
            return this.row;
        }).sort('key').each(function () {
            max = this.max(function () {
                return this.h;
            })
            this.each(function () {
                this.h = max;
                this.y = d;
            })
            d += max;
        })
        
        d = 0;
        map.group(function () {
            return this.col;
        }).sort('key').each(function () {
            max = this.max(function () {
                return this.w;
            })
            this.each(function () {
                this.w = max;
                this.x = d;
                switch(styles.align){
                    case 'left': break;
                    case 'center': this.x += this.w / 2; break;
                    case 'right': this.x += this.w; break;
                }
                this.space = xspace;
            })
            d += max + xspace;
        })
        
        return map.selectmany(function () {
            return new Label(extend({
                content: this.content,
                row: this.row,
                col: this.col,
                space: this.space
            }, styles), this.x, this.y, this.w, this.h);
        }).array();
    }
    
    var ToolTip = function (_canvas, content, x, y, styles) {
        var ctx = _canvas.getContext(),
            w,
            h,
            labels;
            
        styles = extend({
            space: 15,
            position: 'top',
            color: '#333',
            align: 'center',
            vertical: 'top'
        }, styles)
            
        if(tool.isString(content)){
            var label = new Label(extend({
                content: content,
            }, styles), 0, 0, w, h);
        
            label.init(_canvas);
        
            labels = [label];
        }else if(content.defines){
            labels = Table(_canvas, content.defines, content.datas, styles);
        }
        
        if(!labels) return false;
        
        labels = new linq(labels);
        w = labels.group(function () {
            return this.col;
        }).sum(function (d, i) {
            return this.max(function () {
                return this.w + (i=== 0 ? 0 : this.space);
            })
        });
        h = labels.group(function () {
            return this.row;
        }).sum(function () {
            return this.max(function () {
                return this.h;
            })
        });
        
        switch(styles.position){
            case 'left': 
                x = x - w;
                break;
            case 'right': 
                x = x + w;
                break;
            case 'top':
                y = y - h;
                break;
            case 'bottom':
                break;
        }
        x = Math.max(Math.min(_canvas.width - w / 2 + styles.space * 2, x), w / 2 + styles.space * 2);
        y = Math.max(Math.min(_canvas.height - h - styles.space, y), styles.space);
        
        new Border('tip', x - w / 2 - styles.space, y - styles.space / 2, w + styles.space * 2, h + styles.space, { color: '#FFE41E', radius: 5}).render(_canvas);
        ctx.fillStyle = 'rgba(175, 216, 248, 0.9)';
        ctx.fill();
        
        if(tool.isString(content)){
            labels.each(function (label) {
                each(label.content, function () {
                    this.x = x + this.x;
                    if(label.align === 'left') this.x -= label.w / 2;
                    else if(label.align === 'right') this.x += label.w / 2;
                    this.y = y + this.y;
                })
                label.render(_canvas);
            });
        }else{
            labels.each(function (label) {
                this.x = x - w / 2 + this.x;
                this.y = y + this.y;
                //new Border('tip', this.x - this.w / 2, this.y, this.w, this.h, { color: '#FFF', radius:1}).render(_canvas);
                label.init(_canvas);
                label.render(_canvas);
            });
        }
    }
    
    chart.extend = function(){
        var args = tool.toArray(arguments);
        args.unshift(defaults);
        extend.apply(null, args);
    }
    global.chart = chart;
})(window.XT = window.XT || {})