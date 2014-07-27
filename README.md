fack-extends
============

在正文开始之前，先唠嗑一点别的。   
JS的原型链继承的思想非常优秀，但易用性终究没有Java/C++来得好，而且事实上大家都更倾向于使用后者。程序员的世界，简单易用第一。   
事实上，网上有很多种解决方案提供了类似后者的继承，但是都各有缺陷。要么只是简单的扩展，将父类的方法绑定到子类上，比如各种库的`extends`方法。要么引入整个巨型开发库，更有甚者直接污染JS原生对象。这里点名批评PrototypeJS，虽然我的方法从它那里学来。用这个库，唯一目的就是它的继承帮助函数，然而PrototypeJS本身是个极大的开发库，而且Bug众多，少人维护，污染JS原生对象，还有最重要的$符。   
另外提一下WinJS，我的另一个灵感来源。在WinJS出来之前我甚至没能想到微软在JS上有如此造诣。WinJS是个非常碉堡的JS开发库，值得一试。但是为了一个继承帮助函数引入一个完整的开发库，这是极不明智的。   
<!--more-->
   
好了，话归正题。工欲善其事，必先利其器，首先列举开发目标：   
1.  简单。这个工程的目的，仅仅是为了一个继承帮助函数，我无意于弄出一个功能复杂难用的工具，这违背我的初衷。工具实现可以很复杂，但保证功能简单易用。   
2.  模拟Java的继承机制，包括构造函数、动态绑定、静态绑定和父类引用。   
3.	当对象实例化(`new`它的时候)构造函数自动调用。且能提供一个方法让子类的构造函数能够手动调用父类的构造函数。   
4.	能够动态绑定方法和属性，这部分方法和属性应当在`new`一个实例之后才能通过这个实例访问到。   
5.	提供静态绑定，这部分方法和属性应当通过类名访问。实例化一个对象之后，通过实例不可访问这部分方法和属性。   

目标很好但是和现实总是有差距的，由于JS本身的限制，很多事情，除了期待ECMAScript6之外是做不到的。比如：   
1.	多态，或者说，通用的参数选择方案。这个事恐怕ECMAScript6也够呛，几乎所有弱类型语言都有着毛病。要实现多态，只能由每个方法自己适配参数列表。   
2.	访问控制。这个不用多说。不过访问控制这种事情，其实质就是某种约定，跟语言本身实现无太大关系。   

说了这么多，是该上干货了。首先讲讲这里用到的技术和部分构思，大家感受一下。   
1.	关于原型链   
JS的对象都有一个原型，类似于别的语言中的父类。JS中一切皆对象，包括函数，它其实是一个函数对象。一个函数对象的原型，就是一个`Function`对象实例。这里可能牵扯到非常多的关于JS对象的知识，不一一展开，回头再开一篇文章写这事。   
原生JS的继承原理，就是通过原型来记录一个父类实例。由于是一个完整实例，因此不仅会记录方法，还会记录属性值。通过原型链属性`prototype`或者JS的自动机制可以很方便的访问到，不过普遍看法是这种做法效率不佳。   
2.	关于函数的绑定   
JS的方法执行时候，会自动初始化一个`this`变量，这个变量即方法执行的上下文，或者说这个方法所属的对象。聪明如你肯定能举一反三知道，普通函数就是属于`window`的，于是`this`指向它。关于`this`在各种情况下究竟指哪里，各位看官可以自己动手写一写自然明白，或者回头等我另开一文说这事。   
如果要更改一个方法的`this`指针，需要用到函数对象的`call`, `apply`或者`bind`方法。这就是实现继承的最主要技术。关于这三个方法的使用自行Google。   
3.	关于继承   
从语言层面来说，继承的思想其实很简单，就是让子类能够访问到父类的属性和方法的副本。注意到这里所说的是副本。实际上我们可以这么理解，一个类实例化之后，单独保存了父类的一个实例（这也是原型链继承的核心要义），通过不同的入口访问到的属性和方法，其作用域范围是不同的。这里所说的入口，在C++或Java那里可以理解成类型层级，比如父类型变量或者子类型变量，在JS这里则是不同层次的`__proto__`变量。   
既然如此，实现继承的方法就是让子类保存父类的方法和属性的副本。   
4.	类型信息   
Java的类有一个`Class<?>`属性，保存了类的类型信息。摒弃掉各种繁复的方法和属性，其实这个`Class`就是为了提供关于类的类型链、接口、属性和方法的相关信息。JS完全可以移植这个概念，使得动态绑定以及构造函数继承方面事半功倍。   
5.	闭包   
闭包的概念或许很少人能理解清楚。这里吐槽一下，一货自称是平安保险前端架构师来面试，要价25-30K，一问闭包是啥，不知。呵呵！   
参考这个例子：   
{% codeblock lang:js %}
for (var i = 0; i < 10; i++) {
	someEle.addEventListener('click', function (e) {
		var k = list[i];
		...
	});
}
{% endcodeblock %}
在这个例子中，事件函数里边的k，永远只能拿到`list[10]`，因为`i`是`for`这个闭包维护的变量，`for`执行完之后，`i`的值是10。要让事件函数能够拿到1到9，需要在`for`里边加入立即执行函数，将`i`作为参数，利用这个函数维护一个新的变量，让`i`固化下来。当然，这个例子很傻，更好一点的例子自行Google。   

**提供继承、构造函数、动态绑定、静态绑定**   
这个方法是从WinJS那里挖来的，帮助函数提供是个参数   
{% codeblock lang:js %}
/**
 * 构造一个类
 * @param _a {*} 父类引用或构造函数
 * @param [_b] {function|{}} 构造函数或需要运行期绑定的方法
 * @param [_c] {{}|null} 需要运行期绑定的方法或null
 * @param [_d] {{}|null} 需要静态绑定的方法或null
 * @returns {}
 */
module.create = function (_a, _b, _c, _d) {
	// …
}
{% endcodeblock %}
至此，参数的形式只允许以下两种情况   
1.	Parent, Constructor, [prototype, [_static]]   
2.	Constructor, [prototype, [_static]]   

不符合规范的，都会直接导致错误无法执行。事实上，作为弱类型语言，我们通常无法预期用户将会以什么样的形式提供参数。不过对于这事情其实问题不大，参数弄错了程序肯定跑不起来。   
我们仍然需要做一些参数适配的工作：   
{% codeblock lang:js %}
var bType = typeof _b;
if ('object' == bType || undefined == _b) {
	// 当第二个参数是object或未定义时，表明是第二种参数格式
	_d = _c;
	_c = _b;
	_b = _a;
	_a = Object;
}
_d = _d || {};
_c = _c || {};
_b = _b || new Function();
{% endcodeblock %}
上边的代码，通过检查参数`_b`来确定如何移动参数位置，以使参数列表尽量符合最长的规则，即把参数填满。注意上边的`_a = Object`，这一来，当如果没有提供需要继承的类时，其就从`Object`继承下来。后边几行是对参数为空时做的默认赋值操作。”`||`”这种方法逼格相当高。之后我会将这几个参数丢到一个闭包(一个立即执行函数)里，通过闭包维护参数的引用，避免JS变量本身带来的一些小问题。   
   
这样一来，要实现继承只需要做到以下几点：   
1.	创建一个新的类，为它绑定静态方法和属性，并记录类的类型信息   
2.	将构造函数绑定到类的实例上   
3.	在new要给类时，将需要动态绑定的方法和属性绑定到类的实力上   
4.	提供一种机制，让类的方法可以方位到父类实例副本。   

**方法和属性的绑定**
主要靠以下几个方法，静态和动态绑定都可以使用，依次调用它们可以完成绑定，并在方法调用时，附加一个父类实例引用到参数列表末端，自行感受一下：
{% codeblock lang:js %}
/**
 * 制作父类对象引用
 * 基本原理是，深度复制一份父类。为了实现深度复制：
 * 函数会通过new一个Function并绑定到父类引用对象上
 * 属性会直接附加到上边
 * @param $parent
 * @param $this
 * @returns {Object}
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
{% endcodeblock %}
**构造函数**   
实现构造函数需要注意几点：   
1.	父类构造函数不能丢。   
2.	必须是在类被`new`一个实例时自动执行   

仔细看这段代码
{% codeblock lang:js %}
var _constructor = function () {
	var _args = slice.call(arguments, 0);
	var $super = parentClass._constructor || new Function();
	$super = $super.bind(this);
	_args.push($super);
	constructor.apply(this, _args);
};
{% endcodeblock %}
通常来说，既然通过闭包维护参数，东西丢进去之后外边就找不到了的。但JS的引用传递很好的解决了这一问题。实际上，在JS中一切皆对象，还是能够自由添加属性的对象。构造子类时，很容易通过父类的`Class`对象获得父类的构造函数。这个函数最后一行中，`constructor`执行时绑定的对象指针式`this`，因为这个函数执行时，函数的`this`应当指向调用它的类。   
所幸原生的JS是有构造函数这个说法的。在原生的JS构造函数中执行我们定义的构造函数就能完成实例化时执行这一目标，并且还能做到更多，比如动态绑定。
{% codeblock lang:js %}
var _Class = function (){
	_constructor.apply(this, arguments);
	…
}
{% endcodeblock %}
事实上执行这个帮助类，最后返回的是这个`_Class`。`_Class`是一个`Function`对象，`new`这个`_Class`会执行这个函数，然后获得一个`Object`。不要理会JS的怪异之处。这个`function`自然就是原生JS的构造函数。我们还要在里边做一些更神奇的事情，比如动态绑定。   

改进的地方还有很多，有想法的欢迎联系，代码在[这里](https://github.com/yanleaon/fack-extends)，只有简单的自测，欢迎帮忙找bug。   
你们自行感受一下。
