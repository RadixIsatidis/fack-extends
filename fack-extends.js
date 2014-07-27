/**
 * Created by Yan on 14-7-19.
 * 一个用于模仿Java继承机制的帮助类。设计目的：
 * 1. 提供独立的构造函数
 * 2. 可实现方法的运行期绑定，即这些方法需要在类实例化时才能够被访问到。
 * 3. 可实现方法的静态绑定，即这些方法在类被实例化之前，可以通过类名访问，且无论是否实例化，也只能用类名访问
 * 4. 无论运行期绑定还是静态绑定，都提供一个参数用以访问父类的其他方法
 * 5. 当访问父类方法时，应当做到，this指针始终指向当前实例，通过this指针访问的方法和属性，优先调用当前实例（虚继承）
 */
;
(function (factory) {
	// Support three module loading scenarios
	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		// [1] CommonJS/Node.js
		var target = module['exports'] || exports; // module.exports is for Node.js
		factory(target);
	} else if (typeof define === 'function' && define['amd']) {
		// [2] AMD anonymous module
		define(['exports'], factory);
	} else {
		// [3] No module loader (plain <script> tag) - put directly in global namespace
		factory(window['Class'] = {});
	}
})(function (module) {
	"use strict";
	module = module || {};
	// Add ECMA262-5 method binding if not supported natively
	if (!('bind' in Function.prototype)) {
		Function.prototype.bind = function (owner) {
			var that = this;
			if (arguments.length <= 1) {
				return function () {
					return that.apply(owner, arguments);
				};
			} else {
				var args = Array.prototype.slice.call(arguments, 1);
				return function () {
					return that.apply(owner, arguments.length === 0 ? args : args.concat(Array.prototype.slice.call(arguments)));
				};
			}
		};
	}

	var _keys = Object.keys || function (obj) {
		var keys = [];
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				keys.push(i);
			}
		}
		return keys;
	};
	var _forEach = function (obj, callback) {
		var _each = Array.forEach || function (action, that /*opt*/) {
			that = that || this;
			for (var i = 0, n = that.length; i < n; i++)
				if (i in that)
					action.call(that, that[i], i, that);
		};
		return _each.call(obj, callback);
	};
	var slice = Array.prototype.slice;

	var _function = 'function';
	var isFunction = function (fn) {
		return _function == typeof fn;
	};

	var argRegex = /^function\s+\((.*)\)\s+\{?/i;
	var fnHeadRegex = /^function\s+\(.*\)\s+\{?/i;
	var fnTailRegex = /\}$/i;
	var getArgList = function (fnStr) {
		fnStr = fnStr || '';
		var argList;
		if (argList = fnStr.match(argRegex)) {
			argList = argList[1];
		} else {
			argList = '';
		}
		var _arr = argList.split(',');
		var res = [];
		_forEach.call(_arr, function (val) {
			res.push(val.trim());
		});
		return res;
	};
	getArgList();

	var getFnBody = function (fnStr) {
		return fnStr.replace(fnHeadRegex, '').replace(fnTailRegex, '').trim();
	};

	/**
	 * 构造一个类
	 * @param _a {*} 父类引用或构造函数
	 * @param [_b] {function|{}} 构造函数或需要运行期绑定的方法
	 * @param [_c] {{}|null} 需要运行期绑定的方法或null
	 * @param [_d] {{}|null} 需要静态绑定的方法或null
	 * @returns {}
	 */
	module.create = function (_a, _b, _c, _d) {
		/*
		 参数的形式只允许一下几种情况
		 1. Parent, Constructor, [prototype, [_static]]
		 2. Constructor, [prototype, [_static]]
		 不符合规范的，都会直接导致错误无法执行
		 */
		var bType = typeof _b;
		if ('object' == bType || undefined == _b) {
			// 当第二个参数是object时，表明是第二种参数格式
			_d = _c;
			_c = _b;
			_b = _a;
			_a = Object;
		}
		_d = _d || {};
		_c = _c || {};
		_b = _b || new Function();

		return (function (Clazz, constructor, prototype, _static) {
			var ParentClass = Clazz.Class || {};
			/*
			 处理构造函数
			 构造函数至少会提供一个参数（放在参数列表最后），用以指向父类的构造函数。
			 */
			var _constructor = function () {
				var _args = slice.call(arguments, 0);
				var $super = ParentClass._constructor || new Function();
				$super = $super.bind(this);
				_args.push($super);
				constructor.apply(this, _args);
			};
			// 获得父类的运行期绑定方法集
			var $parent = ParentClass._prototype || {};

			/*
			 源对象：提供要进行绑定的方法、属性的对象
			 目标对象：要绑定方法、属性的对象。
			 进行绑定的基本思路就是，将源对象的方法和属性，复制到目标对象当中，并修改this的指向。
			 */

			/**
			 * 将源对象的方法绑定到目标对象
			 * 注意，源对象只是一个资源对象，目标对象必须是一个对象实例
			 * @param source
			 * @param target
			 * @param parent
			 * @private
			 */
			var _bindElement = function (source, target, parent) {
				// 多个闭包调用父级变量，使用一个闭包维护变量，避免多次调用互相干扰
				(function (source, target, parent) {
					var keys = _keys(source);
					// 遍历源对象的属性和方法
					_forEach(keys, function (key) {
						if (isFunction(source[key])) {
							// 函数需要做特殊处理才能绑定到目标对象上
							target[key] = function () {
								var _args = slice.call(arguments, 0);
								_args.push(parent);
								return source[key].apply(target, _args);
							};
						} else {
							target[key] = source[key];
						}
					});
				})(source, target, parent);
			};
			/**
			 * 向目标对象添加源对象有而目标对象没有的属性
			 * @param source
			 * @param target
			 * @private
			 */
			var _addElements = function (source, target) {
				var keys = _keys(source);
				_forEach(keys, function (key) {
					if (!target.hasOwnProperty(key)) {
						target[key] = source[key];
					}
				});
			};
			/**
			 * 制作父类对象引用
			 * 基本原理是，深度复制一份父类。为了实现深度复制：
			 * 函数会通过new一个Function并绑定到父类引用对象上
			 * 属性会直接附加到上边
			 * @param $parent
			 * @param $this
			 * @returns {{}}
			 * @private
			 */
			var _mkParent = function ($parent, $this) {
				var keys = _keys($parent);
				var parent = {};
				_forEach(keys, function (key) {
					if (isFunction($parent[key])) {
						parent[key] = (new Function(getFnBody($parent[key].toString()))).bind($this);
					} else {
						parent[key] = $parent[key];
					}
				});
				return parent;
			};

			//-------------------------------
			// 类有一个原型的概念。这个类的原型将记录类的构造函数、静态属性和方法、动态属性和方法、父类等等信息
			// 类似于Java的Class类的概念
			var Class = {
				_prototype: prototype,
				_static: _static,
				_parent: Clazz,
				_constructor: _constructor
			};
			//-------------------------------

			var _Class = function () {
				var $that = this;
				var _args = slice.call(arguments, 0);
				/*
				 制作一个parent对象
				 该对象将试图保留父对象所有的元素，除了function
				 父对象的function将会在被包含在一个函数中，函数的this指针将指向当前对象。
				 */
				var parent = _mkParent($parent, $that);

				// 将prototype里边的方法和属性都混合到当前对象中
				// 注意，prototype的方法将作为一个被包裹在一个新的函数当中，在运行期，这个函数的this指针将指向调用它的类.
				_bindElement(prototype, $that, parent);
				_addElements(parent, $that);
				// 兼容原型链。
				// $that.prototype = new Clazz();
				_constructor.apply($that, _args);
			};

			/*
			 制作用于静态绑定的父类的方法集
			 */
			var staticParent = _mkParent(ParentClass._static || {}, _Class);
			_bindElement(_static, _Class, staticParent);
			_addElements(staticParent, _Class);

			_Class.Class = Class;
			_Class.prototype = Clazz;

			return _Class;
		})(_a, _b, _c, _d);
	};

	return module;
});