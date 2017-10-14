Tester.Utils.CreateDiv({add: true, text: "All times are in milliseconds"});

function tabluateTestResults(name, test, countArr, desc)
{
	let columnData = {}
	for(let k = 0; k<countArr.length; k++)
		columnData[countArr[k]] = test(countArr[k])
	let rowLabels = Object.keys(columnData[countArr[0]])
	let rowData = [];
	for(let q = 0; q<rowLabels.length; q++)
	{
		let r = rowLabels[q];
		let rd = [];
		for(let k = 0; k<countArr.length; k++)
			rd.push(columnData[countArr[k]][r].toFixed(3))
		rowData.push(rd)
	}

	let div = Tester.Utils.CreateDiv({add: true});	
	let table = Tester.Utils.CreateTable(rowLabels, countArr, rowData, name)
	div.appendChild(table)
	if(desc)
		div.appendChild(document.createTextNode(desc))
	div.style.fontFamily = "initial";
	return div;
}

//--------------------------------------
// test code
//--------------------------------------

function testObjectIterator()
{
	function test(MAX)
	{
		let v = 0;
		let obj = {};
		while(MAX--)
			obj["key-"+MAX]=MAX;

		let x = performance.now();
		let keys = Object.keys(obj);
		for(let j=0;j<keys.length;j++)
			v = obj[keys[j]];
		let native = performance.now()-x;

		x = performance.now();
		keys = JEEP.Utils.ObjectIterator.New(obj);
		while(keys.GetNext())
		{
			let p = keys.GetCurrPair();
			v = p.value;
		}
		let obkeyIter = performance.now()-x;

		x = performance.now();
		let arr = JEEP.Utils.GetKeyValueArray(obj);
		for(let k = 0; k<arr.length; k++)
			v = arr[k].value;
		let obkeyArr = performance.now()-x;

		return {
			"native (Object.keys)": native, 
			"JEEP.Utils.ObjectIterator": obkeyIter, 
			"JEEP.Utils.GetKeyValueArray": obkeyArr, 
		}
	}
	tabluateTestResults("Object Key Access Trials", test, [10,100,1000])
}

AccTestClasses = {
	NonJeep: null,
	JeepNonConst: null,
	JeepConst: null,
}

function generateAccClasses()
{
	AccTestClasses.NonJeep = function()
	{
		this.value = 100;
		this.obj = {value: 10};
	}
	AccTestClasses.NonJeep.prototype = {
		IncValue: function(){this.value++},
		GetValue: function(){return this.value},
		UpdateObjValue: function(){
			let o = this.GetObj();
			o.value++;
			this.obj = o;
		},
		GetObj: function(){return this.obj}
	}

	let Env = JEEP.CreateEnvironment({client: "jeep-aware", mode: "development-mode"});

	AccTestClasses.JeepNonConst = Env.Object.CreateClass("JeepNonConst", {
		CONSTRUCTOR: function(){},
		Functions: {
			IncValue: function(){this.value++},
			GetValue: function(){return this.value},
			UpdateObjValue: function(){
				let o = this.GetObj();
				o.value++;
				this.obj = o;
			},
			GetObj: function(){return this.obj},
		},
		Variables: {
			value: 0,
			obj: {value: 0},
		}
	})

	AccTestClasses.JeepConst = Env.Object.CreateClass("JeepConst", {
		CONSTRUCTOR: function(){},
		Functions: {
			IncValue: function(){this.value++},
			$const$___GetValue: function(){return this.value},
			UpdateObjValue: function(){
				let o = this.GetObj();
				o.value++;
				this.obj = o;
			},
			$const$___GetObj: function(){return this.obj},
		},
		Variables: {
			value: 0,
			obj: {value: 0},
		}
	});
}
generateAccClasses();

function testValueRead()
{
	function test(MAX)
	{
		function tester(Def)
		{
			let time = 0;
			let a = new Def;
			let arr = [];
			for(let k = 0; k<MAX; k++)
			{
				let x = performance.now();
				arr.push(a.GetValue());
				time += performance.now()-x;
			}
			arr = [];
			return time;
		}
		let nonjeep = tester(AccTestClasses.NonJeep);
		let jeep = tester(AccTestClasses.JeepNonConst);
		let jeepConst = tester(AccTestClasses.JeepConst);
		return {
			"Non Jeep": nonjeep, 
			"Jeep non constant": jeep, 
			"Jeep  constant": jeepConst, 
		}
	}
	tabluateTestResults("Value Read Trials", test, [1, 10,100,1000,10000])
}

function testValueWrite()
{
	function test(MAX)
	{
		function tester(Def)
		{
			let time = 0;
			let a = new Def;
			for(let k = 0; k<MAX; k++)
			{
				let x = performance.now();
				a.IncValue();
				time += performance.now()-x;
			}
			return time;
		}
		let nonjeep = tester(AccTestClasses.NonJeep);
		let jeep = tester(AccTestClasses.JeepNonConst);
		let jeepConst = tester(AccTestClasses.JeepConst);
		return {
			"Non Jeep": nonjeep, 
			"Jeep non constant": jeep, 
			"Jeep  constant": jeepConst, 
		}
	}
	tabluateTestResults("Value Write Trials", test, [1, 10,100,1000,10000])
}

function testObjectRead()
{
	function test(MAX)
	{
		function tester(Def)
		{
			let time = 0;
			let a = new Def;
			let arr = [];
			for(let k = 0; k<MAX; k++)
			{
				let x = performance.now();
				arr.push(a.GetObj());
				time += performance.now()-x;
			}
			arr = [];
			return time;
		}
		let nonjeep = tester(AccTestClasses.NonJeep);
		let jeep = tester(AccTestClasses.JeepNonConst);
		let jeepConst = tester(AccTestClasses.JeepConst);
		return {
			"Non Jeep": nonjeep, 
			"Jeep non constant": jeep, 
			"Jeep  constant": jeepConst, 
		}
	}
	tabluateTestResults("Object Read Trials", test, [1, 10,100,1000,10000])
}

function testObjectWrite()
{
	function test(MAX)
	{
		function tester(Def)
		{
			let time = 0;
			let a = new Def;
			for(let k = 0; k<MAX; k++)
			{
				let x = performance.now();
				a.UpdateObjValue();
				time += performance.now()-x;
			}
			return time;
		}
		let nonjeep = tester(AccTestClasses.NonJeep);
		let jeep = tester(AccTestClasses.JeepNonConst);
		let jeepConst = tester(AccTestClasses.JeepConst);
		return {
			"Non Jeep": nonjeep, 
			"Jeep non constant": jeep, 
			"Jeep  constant": jeepConst, 
		}
	}
	tabluateTestResults("Object Write Trials", test, [1, 10,100,1000,10000])
}

function genPlainSolo()
{
	let Class = function(){};
	Class.prototype.MemfuncA = function(){}
	Class.prototype.MemfuncB = function(){}
	Class.prototype.MemfuncC = function(){}
	Class.prototype.MemfuncD = function(){}
	Class.prototype.MemfuncE = function(){}
	return Class;
}

function genPlainHier()
{
	let Base = genPlainSolo();
	let Derived = function(){}
	Derived.prototype = Object.create(Base.prototype)
	Derived.prototype.MemfuncX = function(){}
	Derived.prototype.MemfuncY = function(){}
	Derived.prototype.MemfuncZ = function(){}
	Derived.prototype.MemfuncP = function(){}
	Derived.prototype.MemfuncQ = function(){}
	return Derived;
}

function genJeepSolo(env)
{
	return env.Object.CreateClass("Class", {
		CONSTRUCTOR: function(){},
		Functions: {
			MemfuncA: function(){},
			MemfuncB: function(){},
			MemfuncC: function(){},
			MemfuncD: function(){},
			MemfuncE: function(){},
		}
	})
}

function genJeepHier(env)
{
	let Base = genJeepSolo(env);
	return env.Object.CreateClass("Derived", {
		CrBaseClass: [Base],
		CONSTRUCTOR: function(){},
		Functions: {
			MemfuncX: function(){},
			MemfuncY: function(){},
			MemfuncZ: function(){},
			MemfuncP: function(){},
			MemfuncQ: function(){},
		}
	})
}

function genDiamond(env)
{
	let TopBase = env.Object.CreateClass("TopBase", {
		CONSTRUCTOR: function(){},
		Functions: {
			tbfuncA: function(){},
			tbfuncB: function(){},
			tbfuncC: function(){},
			tbfuncD: function(){},
			tbfuncE: function(){},
		}
	})
	let MidBaseA = env.Object.CreateClass("MidBaseA", {
		CrBaseClass: [TopBase],
		CONSTRUCTOR: function(){},
		Functions: {
			ambfuncA: function(){},
			ambfuncB: function(){},
			ambfuncC: function(){},
			ambfuncD: function(){},
			ambfuncE: function(){},
		}
	})
	let MidBaseB = env.Object.CreateClass("MidBaseB", {
		CrBaseClass: [TopBase],
		CONSTRUCTOR: function(){},
		Functions: {
			bambfuncA: function(){},
			bmbfuncB: function(){},
			bmbfuncC: function(){},
			bmbfuncD: function(){},
			bmbfuncE: function(){},
		}
	})
	let Derived = env.Object.CreateClass("Derived", {
		CrBaseClass: [MidBaseB, MidBaseA],
		CONSTRUCTOR: function(){},
		Functions: {
			funcA: function(){},
			funcB: function(){},
			funcC: function(){},
			funcD: function(){},
			funcE: function(){},
		}
	})
	return Derived;
}

function genVirtDiamond(env)
{
	let TopBase = env.Object.CreateClass("TopBase", {
		CONSTRUCTOR: function(){},
		Functions: {
			tbfuncA: function(){},
			tbfuncB: function(){},
			tbfuncC: function(){},
			tbfuncD: function(){},
			tbfuncE: function(){},
			$virtual$__someFunction: function(){},
		}
	})
	let MidBaseA = env.Object.CreateClass("MidBaseA", {
		CrBaseClass: [TopBase],
		CONSTRUCTOR: function(){},
		Functions: {
			ambfuncA: function(){},
			ambfuncB: function(){},
			ambfuncC: function(){},
			ambfuncD: function(){},
			ambfuncE: function(){},
			$virtual$__someFunction: function(){},
		}
	})
	let MidBaseB = env.Object.CreateClass("MidBaseB", {
		CrBaseClass: [TopBase],
		CONSTRUCTOR: function(){},
		Functions: {
			bambfuncA: function(){},
			bmbfuncB: function(){},
			bmbfuncC: function(){},
			bmbfuncD: function(){},
			bmbfuncE: function(){},
			$virtual$__someFunction: function(){},
		}
	})
	let Derived = env.Object.CreateClass("Derived", {
		CrBaseClass: [MidBaseB, MidBaseA],
		CONSTRUCTOR: function(){},
		Functions: {
			funcA: function(){},
			funcB: function(){},
			funcC: function(){},
			funcD: function(){},
			funcE: function(){},
			$virtual$__someFunction: function(){},
		}
	})
	return Derived;
}

function genComplexDiamond(env)
{
	let TopBase = env.Object.CreateClass("TopBase", {
		CONSTRUCTOR: function(){},
		Variables: {$get_set$__tbval: 0},
		Protected: {
			tbprotval: 0,
			$const$__tbprotfunc: function(){},
		},
		Private: {
			value: 0,
			$const$__helper: function(){},
		},
		Functions: {
			tbfuncA: function(){},
			tbfuncB: function(){},
			tbfuncC: function(){},
			tbfuncD: function(){},
			$const$__tbfuncE: function(){},
			$virtual$__someFunction: function(){},
		}
	})
	let MidBaseA = env.Object.CreateClass("MidBaseA", {
		CrBaseClass: [TopBase],
		CONSTRUCTOR: function(){},
		Variables: {$get_set$__ambval: 0},
		Protected: {
			ambprotval: 0,
			$const$__ambprotfunc: function(){},
		},
		Private: {
			value: 0,
			$const$__helper: function(){},
		},
		Functions: {
			ambfuncA: function(){},
			ambfuncB: function(){},
			ambfuncC: function(){},
			ambfuncD: function(){},
			$const$__ambfuncE: function(){},
			$virtual$__someFunction: function(){},
		}
	})
	let MidBaseB = env.Object.CreateClass("MidBaseB", {
		CrBaseClass: [TopBase],
		CONSTRUCTOR: function(){},
		Variables: {$get_set$__bmbval: 0},
		Protected: {
			bmbprotval: 0,
			$const$__bmbprotfunc: function(){},
		},
		Private: {
			value: 0,
			$const$__helper: function(){},
		},
		Functions: {
			bambfuncA: function(){},
			bmbfuncB: function(){},
			bmbfuncC: function(){},
			bmbfuncD: function(){},
			$const$__bmbfuncE: function(){},
			$virtual$__someFunction: function(){},
		}
	})
	let Derived = env.Object.CreateClass("Derived", {
		CrBaseClass: [MidBaseB, MidBaseA],
		CONSTRUCTOR: function(){},
		Variables: {$get_set$__val: 0},
		Protected: {
			protval: 0,
			$const$__protfunc: function(){},
		},
		Private: {
			value: 0,
			$const$__helper: function(){},
		},
		Functions: {
			funcA: function(){},
			funcB: function(){},
			funcC: function(){},
			funcD: function(){},
			$const$__funcE: function(){},
			$virtual$__someFunction: function(){},
		}
	})
	return Derived;
}

function testGeneration()
{
	function test(MAX)
	{
		let dev = JEEP.CreateEnvironment({client: "jeep-aware", mode: "development-mode"});
		let prod = JEEP.CreateEnvironment({client: "jeep-aware", mode: "production-mode"});
		let x = 0;
		let tPlainSolo = 0, tPlainHier = 0, 
			tDevSolo = 0, tDevHier = 0,
			tProdSolo = 0, tProdHier = 0,
			tDevDiamond = 0, tProdDiamond = 0,
			tDevVirtDiamond = 0, tProdVirtDiamond = 0,
			tDevComplexDiamond = 0, tProdComplexDiamond = 0;
		for(let k = 0; k<MAX; k++)
		{
			x = performance.now();
			genPlainSolo();
			tPlainSolo += performance.now()-x;

			x = performance.now();
			genPlainHier();
			tPlainHier += performance.now()-x;

			x = performance.now();
			genJeepSolo(dev);
			tDevSolo += performance.now()-x;

			x = performance.now();
			genJeepSolo(prod);
			tProdSolo += performance.now()-x;

			x = performance.now();
			genJeepHier(dev);
			tDevHier += performance.now()-x;

			x = performance.now();
			genJeepHier(prod);
			tProdHier += performance.now()-x;

			x = performance.now();
			genDiamond(dev);
			tDevDiamond += performance.now()-x;

			x = performance.now();
			genDiamond(prod);
			tProdDiamond += performance.now()-x;

			x = performance.now();
			genVirtDiamond(dev);
			tDevVirtDiamond += performance.now()-x;

			x = performance.now();
			genVirtDiamond(prod);
			tProdVirtDiamond += performance.now()-x;

			x = performance.now();
			genComplexDiamond(dev);
			tDevComplexDiamond += performance.now()-x;

			x = performance.now();
			genComplexDiamond(prod);
			tProdComplexDiamond += performance.now()-x;
		}
		return{ 
			"Non Jeep solo": tPlainSolo, 
			"Development mode solo": tDevSolo, 
			"Production mode solo": tProdSolo, 
			"Non Jeep hierarchy": tPlainHier,
			"Development mode hierarchy": tDevHier,
			"Production mode hierarchy": tProdHier,
			"Development mode diamond": tDevDiamond,
			"Production mode diamond": tProdDiamond,
			"Development mode virt diamond": tDevVirtDiamond,
			"Production mode virt diamond": tProdVirtDiamond,
			"Development mode complex diamond": tDevComplexDiamond,
			"Production mode complex diamond": tProdComplexDiamond,
		}
	}
	let desc = "Classes have five empty functions, all public.\n"
    +"Hierarchy is a single level single inheritance with five empty public functions in both base and derived classes.\n"
    +"Diamond is a single level diamond with all classes having five empty public functions.\n"
    +"Virt diamond is same as diamond but with one virtual function in all classes.\n"
    +"Complex diamond is virt diamond with every class having one constant public, protected and private function each. They also have a public variable with get set, and one protected and private variable.\n"
    +"Production mode has no flags.\n"
    +"The columns indicate the number of times the classes were generated, which can be interpreted as being a library with as many classes.";
	tabluateTestResults("Class Generation", test, [1,5,10,50], desc)
}

function testInstantiation()
{
	function test(MAX)
	{
		let dev = JEEP.CreateEnvironment({client: "jeep-aware", mode: "development-mode"});
		let prod = JEEP.CreateEnvironment({client: "jeep-aware", mode: "production-mode"});
		let NJSolo = genPlainSolo();
		let NJHier = genPlainHier();
		let DevSolo = genJeepSolo(dev);
		let ProdSolo = genJeepSolo(prod);;
		let DevHier = genJeepHier(dev);
		let ProdHier = genJeepHier(prod);
		let DevDiamond = genDiamond(dev);
		let ProdDiamond = genDiamond(prod);
		let DevVirtDiamond = genVirtDiamond(dev);
		let ProdVirtDiamond = genVirtDiamond(prod);
		let DevComplexDiamond = genComplexDiamond(dev);
		let ProdComplexDiamond = genComplexDiamond(prod);
		let x = 0;
		let inst = null;
		let tPlainSolo = 0, tPlainHier = 0, 
			tDevSolo = 0, tDevHier = 0,
			tProdSolo = 0, tProdHier = 0,
			tDevDiamond = 0, tProdDiamond = 0,
			tDevVirtDiamond = 0, tProdVirtDiamond = 0,
			tDevComplexDiamond = 0, tProdComplexDiamond = 0;
		for(let k = 0; k<MAX; k++)
		{
			x = performance.now();
			inst = new NJSolo;
			tPlainSolo += performance.now()-x;

			x = performance.now();
			inst = new NJHier;
			tPlainHier += performance.now()-x;

			x = performance.now();
			inst = new DevSolo;
			tDevSolo += performance.now()-x;

			x = performance.now();
			inst = new ProdSolo;
			tProdSolo += performance.now()-x;

			x = performance.now();
			inst = new DevHier;
			tDevHier += performance.now()-x;

			x = performance.now();
			inst = new ProdHier;
			tProdHier += performance.now()-x;

			x = performance.now();
			inst = new DevDiamond;
			tDevDiamond += performance.now()-x;

			x = performance.now();
			inst = new ProdDiamond;
			tProdDiamond += performance.now()-x;

			x = performance.now();
			inst = new DevVirtDiamond;
			tDevVirtDiamond += performance.now()-x;

			x = performance.now();
			inst = new ProdVirtDiamond;
			tProdVirtDiamond += performance.now()-x;

			x = performance.now();
			inst = new DevComplexDiamond;
			tDevComplexDiamond += performance.now()-x;

			x = performance.now();
			inst = new ProdComplexDiamond;
			tProdComplexDiamond += performance.now()-x;
		}
		return{ 
			"Non Jeep solo": tPlainSolo, 
			"Development mode solo": tDevSolo, 
			"Production mode solo": tProdSolo, 
			"Non Jeep hierarchy": tPlainHier,
			"Development mode hierarchy": tDevHier,
			"Production mode hierarchy": tProdHier,
			"Development mode diamond": tDevDiamond,
			"Production mode diamond": tProdDiamond,
			"Development mode virt diamond": tDevVirtDiamond,
			"Production mode virt diamond": tProdVirtDiamond,
			"Development mode complex diamond": tDevComplexDiamond,
			"Production mode complex diamond": tProdComplexDiamond,
		}
	}
	let desc = "The same classes involved in generation test were instantiated"
	tabluateTestResults("Class Instantiation", test, [1,5,10,50, 100, 500], desc)
}
testObjectIterator();
testValueRead();
testValueWrite();
testObjectRead();
testObjectWrite();
testGeneration();
testInstantiation();
Tester.Utils.CreateTimeStamp();