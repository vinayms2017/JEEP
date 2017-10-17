// TODO:
// reorganize tests
// add aspects to all tests
// update the descripton to be...descriptive

TestEnvInfo = {
	df: {},
	SPECIAL_FOCUS_ON: !true,// toggle this as necsessary, and add focusThis for the appropriate test
}

 RunJeepTest = function(parent)
{	
	JEEP.InitTest();
	let DevEnv = JEEP.CreateEnvironment({mode: "development-mode", client: "jeep-aware"});
	let ProdEnv = JEEP.CreateEnvironment({
		mode: "production-mode", client: "jeep-aware",
		flags: "retain-const, retain-argtypes, retain-argnum, retain-argconst, retain-protected, retain-internal-varchange, retain-abstract-check, retain-init-change-check"
	});

	let runnable = [];
	let testList = [];

	let devPassTestCount = 0;
	let devFailTestCount = 0;
	let prodPassTestCount = 0;
	let prodFailTestCount = 0;
	let genPassTestCount = 0;
	let genFailTestCount = 0;

	// generate the tests

	let testNames = [
	"EnvNamespace",
	"Utils",
	"RecStruct",
	"ClassGen", 
	"Robustness",
	"SingleInheritance",
	"MultipleInheritance",
	"Hierarchy",
	"Private",
	// protected is generated separately
	"Wrapper",
	"Scoped",
	"ProductionMode",
	"Library",
	"Misc", 
	];

	let tests = [];
	for(let k = 0; k<testNames.length; k++)
		tests.push(TestEnvInfo.generateTest(testNames[k]))

	let envs = {devEnv: DevEnv, prodEnv: ProdEnv}
	for(let k = 0; k<tests.length; k++)
	{
		let func = tests[k];
		let res = func.call(TestEnvInfo, envs);
		devPassTestCount += res.devPassCount;
		prodPassTestCount += res.prodPassCount;
		devFailTestCount += res.devFailCount;
		prodFailTestCount += res.prodFailCount;
		genPassTestCount += res.passCount;
		genFailTestCount += res.failCount;
		testList = testList.concat(res.testList);
	}
	// special case for Protected since it needs three environments (dev, prod with retain, prod without retain)
	let res = TestEnvInfo.generateProtectedTests(DevEnv, ProdEnv, testList)
	devPassTestCount += res.devPassCount;
	prodPassTestCount += res.prodPassCount;
	devFailTestCount += res.devFailCount;
	prodFailTestCount += res.prodFailCount;
	genPassTestCount += res.passCount;
	genFailTestCount += res.failCount;

	// mark runnable tests

	for(let k = 0; k<testList.length; k++)
	{
		let test = testList[k];
		if(TestEnvInfo.SPECIAL_FOCUS_ON && test.focusThis)
			runnable.push(test);
	}

	// run the tests
	
	let passCount = 0;
	let runCount = 0;
	let failedTests = [];
	let devRunTime = 0;
	let prodRunTime = 0;
	
	for(let k = 0; k<testList.length; k++)
	{
		let test = testList[k];
		if(runnable.length > 0 && runnable.indexOf(test) < 0)
		{
			let div = Tester.Utils.CreateDiv({add: true});
			div.textContent += "Blocked test: '" + test.name + "'";
			continue;
		}
		runCount++;	
		
		let cout = JEEP.CreateTestCase(test);

		let ex = null;

		try
		{
			let x = performance.now();
			test.func(cout);
			x = performance.now()-x;
			if(test.devmode)
				devRunTime += x;
			else
				prodRunTime += x;
		}
		catch(e){ex = "EXCEPTION: " + e.message||e}
		
		let res = JEEP.RunTestCase();
		parent.appendChild(res.div)
		res.div.textContent = (k+1)+": "+res.div.textContent;

		if(!res.status && ex)
		{
			let div = Tester.Utils.CreateDiv({
				style: {fontSize: "14px", fontStyle: "italic"}
			});
			div.style.color = "black";
			div.style.margin = 0;
			div.textContent = ex;	
			res.div.insertBefore(div, res.div.firstChild);	
			res.status = false;
		}	

		if(res.status)
			passCount++;
		else
		{
			res.div.style.color = "red";
			failedTests.push({name: test.name, id: res.div.id});
		}		
	}

	// show the result summary

	let text = "";

	text = Tester.Utils.GetFormattedText({
		map: {
			"Development mode passing tests": devPassTestCount, 
			"Development mode failing tests": devFailTestCount, 
			"Production mode passing tests": prodPassTestCount, 
			"Production mode failing tests": prodFailTestCount, 
		},
		symCount: 5,
		sym: ".",
	});
	Tester.Utils.CreateDiv({add: true, text: text});

	text = "";
	if(failedTests.length == 0)
	{
		if(TestEnvInfo.SPECIAL_FOCUS_ON)
			text += "BLOCKED: "+(testList.length-runCount)+" Focused tests (" + passCount + ") PASSED\n";
		else
			text += "All tests (" + passCount + ") PASSED" + " (pass-tests: " +genPassTestCount+ " fail-tests: " +genFailTestCount+ ")\n";
	}
	else
	{
		if(TestEnvInfo.SPECIAL_FOCUS_ON)
			text += "BLOCKED: "+(testList.length-runCount)+" Focused tests: " + runCount + " Passed: " + passCount + " Failed: " + (runCount - passCount) + "\n";
		else
			text += "Total tests: " + runCount + " (pass-tests: " +genPassTestCount+ " fail-tests: " +genFailTestCount+ ")" + " Passed: " + passCount + " Failed: " + (runCount - passCount) + "\n";
	}	

	let resdiv = Tester.Utils.CreateResultDiv({add: true, text: text});
	if(failedTests.length > 0)
		Tester.Utils.CreateFailList(failedTests, true);// add navigation

	text = "Some rough time estimates (in milliseconds)\n";
	text += Tester.Utils.GetFormattedText({
		arr: [
			{
				text: (devPassTestCount)+" development mode passing tests ran in",
				value: devRunTime.toFixed(3)
			},
			{
				text: (prodPassTestCount)+" production mode passing tests ran in",
				value: prodRunTime.toFixed(3)
			},
		],
		symCount: 5,
		sym: ".",
	});
	let time = Tester.Utils.CreateDiv({add: true, text: text});
	time.style.margin = "1em 0"
	resdiv.appendChild(time);

	let asp = Tester.CreateAspectsBrowser();
	if(asp)
		document.body.append(asp);
	
	Tester.Utils.CreateTimeStamp();
}

TestEnvInfo.addPrefix = function(testList, pass, devmode, m)
{
	for(let k = 0; k<testList.length; k++)
	{
		let test = testList[k];
		let n = test.name;
		if(!m)
			m = (devmode?"dev":"prod");
		let pf = (pass?"pass":"fail");
		test.name = "["+m+"-"+pf+"] "+n;
		test.devmode = devmode;// helps in separate timing
	}
}

TestEnvInfo.genEnvTest = function(env, passFunc, failFunc)
{
	let pass = [], fail = [];

	if(passFunc)
		passFunc(env, pass);
	if(failFunc)
		failFunc(env, fail);

	TestEnvInfo.addPrefix(pass, true, env.IsDevMode())
	TestEnvInfo.addPrefix(fail, false, env.IsDevMode())

	let ret = {passCount: pass.length, failCount: fail.length, testList: []}
	ret.testList = ret.testList.concat(pass);
	ret.testList = ret.testList.concat(fail);
	return ret;
}

TestEnvInfo.genTest = function(info, passFunc, failFunc)
{
	let dev = this.genEnvTest(info.devEnv, passFunc, failFunc);
	let prod = this.genEnvTest(info.prodEnv, passFunc, failFunc);
	let tl = dev.testList;
	tl = tl.concat(prod.testList);
	return {
		passCount: dev.passCount + prod.passCount,
		failCount: dev.failCount + prod.failCount, 
		devPassCount: dev.passCount,
		devFailCount: dev.failCount,
		prodPassCount: prod.passCount,
		prodFailCount: prod.failCount,
		testList: tl
	}
}

TestEnvInfo.generateTest = function(name)
{
	let testName = "test_"+name;
	let passFunc = TestEnvInfo["pass"+testName];
	let failFunc = TestEnvInfo["fail"+testName];
	if(!passFunc && !failFunc)
		throw "BadTest "+name
	return function(info){
		return TestEnvInfo.genTest(info, passFunc, failFunc);
	}
}

TestEnvInfo.passtest_ = function(env, testList)
{
}

TestEnvInfo.failtest_ = function(env, testList)
{
}

TestEnvInfo.simpleTester = function(className, funcList, failCount)
{
	let Class = JEEP.GetClass(className);
	let c = new Class;
	if(funcList)
	{
		for(let k = 0; k<funcList.length; k++)
			try{c[funcList[k]]()}catch(e){if(!failCount)throw e}
	}
}

TestEnvInfo.complexTester = function(className, funcList, failCount)
{
	let Class = JEEP.GetClass(className);
	let c = new Class;
	for(let k = 0; k<funcList.length; k++)
	{
		let f = funcList[k];
		try{f.func.apply(c, f.args)}catch(e){if(!failCount)throw e}
	}
}

TestEnvInfo.passtest_Misc = function(env, testList)
{
	testList.push({
		name: "layout",
		desc: "Tests layouts of definition and instance of record, structure and class",
		exp: [
		"rdef: $name,InstanceOf,New",
		"rinst: $name,dummy,Clone,Change,Equal",
		"sdef: $name,Dummy,InstanceOf,New,InitNew",
		"sinst: $def,$name,dummy,Clone,Change,Equal,Dummy,InstanceOf,New,InitNew",
		],
		func: function(cout){
			let names = null;
			let Rec = env.Object.CreateRecord("Dummy", { dummy: 0});
			names = Object.keys(Rec);
			cout("rdef: "+names.join())
			names = Object.keys(Rec.New());
			cout("rinst: "+names.join())
			let Struct = env.Object.CreateStruct("Dummy", { 
				CONSTRUCTOR: function(){},
				Variables: {dummy: 0},
				Functions: {Dummy: function(){}}
			});
			names = Object.keys(Struct);
			cout("sdef: "+names.join())
			names = Object.keys(Struct.New());
			cout("sinst: "+names.join())
			let Class = env.Object.CreateClass("Dummy", { 
				CONSTRUCTOR: function(){},
				DESTRUCTOR: function(){},
				Variables: {dummy: 0},
				Functions: {Dummy: function(){}},
				Private: {var: 0, func: function(){}},
				Static:  {var: 0, func: function(){}},
			});
			// TODO
			// names = Object.keys(Class);
			// cout("cdef: "+names.join())
			// let c = new Class();
			// names = Object.keys(c);
			// let cn = Object.keys(Object.getPrototypeOf(c));
			// names = names.concat(cn);
			// cout("cinst: "+names.join())
		}
	});

}

TestEnvInfo.failtest_Misc = function(env, testList)
{
	if(env.IsDevMode())
	{
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-rec-cr",
			desc: "",
			aspects: "record, apiargs",
			exp: [
			"JEEP aborting from CreateRecord. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.CreateRecord("rec");
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-rec-cr-2",
			desc: "",
			aspects: "record, apiargs",
			exp: [
			"JEEP aborting from CreateRecord. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.CreateRecord({});
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-rec-cr-3",
			desc: "",
			aspects: "record, apiargs",
			exp: [
			"JEEP aborting from CreateRecord. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.CreateRecord("rec", null);
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-rec-reg",
			desc: "",
			aspects: "record, apiargs",
			exp: [
			"JEEP aborting from RegisterRecord. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.RegisterRecord();
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-srt-cr",
			desc: "",
			aspects: "struct, apiargs",
			exp: [
			"JEEP aborting from CreateStruct. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.CreateStruct("rec");
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-str-reg",
			desc: "",
			aspects: "struct, apiargs",
			exp: [
			"JEEP aborting from RegisterStruct. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.RegisterStruct();
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-class-cr",
			desc: "",
			aspects: "class, apiargs",
			exp: [
			"JEEP aborting from CreateClass. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.CreateClass("rec");
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-class-reg",
			desc: "",
			aspects: "class, apiargs",
			exp: [
			"JEEP aborting from RegisterClass. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.RegisterClass();
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-class-decl",
			desc: "",
			aspects: "class, apiargs",
			exp: [
			"JEEP aborting from DeclareClass. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.DeclareClass();
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-class-def",
			desc: "",
			aspects: "class, apiargs",
			exp: [
			"JEEP aborting from DefineClass. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.DefineClass();
			}
		});
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "bad-args-wrap",
			desc: "",
			aspects: "wraper, apiargs",
			exp: [
			"JEEP aborting from CreateWrapperClass. The function expects a valid name and a valid description object."
			],
			func: function(cout){
				env.Object.CreateWrapperClass();
			}
		});
	}

	testList.push({
		name: "env-nomode",
		desc: "",
		aspects: "environment",
		exp: [
		"JEEP aborting from CreateEnvironment. The function expects a valid mode parameter.",
		"JEEP aborting from CreateEnvironment. The function expects a valid client parameter.",
		"JEEP aborting from CreateEnvironment. The flags 'abcde,xyz' is invalid."
		],
		func: function(cout){
			try{JEEP.CreateEnvironment({})}catch(e){}
			try{JEEP.CreateEnvironment({mode: "development-mode"})}catch(e){}
			try{JEEP.CreateEnvironment({
				mode: "development-mode", 
				client: "jeep-aware", 
				flags: "abcde, xyz"
			})}catch(e){}
		}
	});

	testList.push({
		name: "get-object",
		desc: "",
		exp: [
		"JEEP aborting from GetRecord. The record '???' is not registered.",
		"JEEP aborting from GetStruct. The struct '???' is not registered.",
		"JEEP aborting from GetClass. The class '???' is not registered.",
		],
		func: function(cout){
			try{JEEP.GetRecord("???")}catch(e){}
			try{JEEP.GetStruct("???")}catch(e){}
			try{JEEP.GetClass("???")}catch(e){}
		}
	});

	testList.push({
		name: "double-register-object",
		desc: "",
		exp: [
		"JEEP aborting from RegisterRecord. The record 'Record' is already registered.",
		"JEEP aborting from RegisterStruct. The struct 'Struct' is already registered.",
		"JEEP aborting from RegisterClass. The class 'Class' is already registered.",
		],
		func: function(cout){
			env.Object.RegisterRecord("Record", {dummy: 0})
			try{env.Object.RegisterRecord("Record", {dummy: 0})}catch(e){}
			env.Object.RegisterStruct("Struct", {Variables:{dummy: 0}})
			try{env.Object.RegisterStruct("Struct", {Variables:{dummy: 0}})}catch(e){}
			env.Object.RegisterClass("Class", {Variables:{dummy: 0}})
			try{env.Object.RegisterClass("Class", {Variables:{dummy: 0}})}catch(e){}
		}
	});

	testList.push({
		name: "double-register-object",
		desc: "",
		exp: [
		"JEEP aborting from MakeArgNumValidated. The given function must have a name so that in case of violation the error messages be meaningful and useful.",
		"JEEP aborting from MakeArgTypeValidated. The given function must have a name so that in case of violation the error messages be meaningful and useful.",
		"JEEP aborting from MakeArgConst. The given function must have a name so that in case of violation the error messages be meaningful and useful.",
		],
		func: function(cout){
			try{env.Function.MakeArgNumValidated(function(){})}catch(e){}
			try{env.Function.MakeArgTypeValidated("", function(){})}catch(e){}
			try{env.Function.MakeArgConst(function(){})}catch(e){}
		}
	});
}

TestEnvInfo.passtest_EnvNamespace = function(env, testList)
{
	testList.push({
		name: "namespace-class-reg",
		desc: "Tests the namespace with class (register)",
		aspects: "namespace",
		exp: ["Namespace.Subnamespace.Class.CONSTRUCTOR args: 100"],
		func: function(cout){
			let Namespace = env.CreateNamespace("Namespace.Subnamespace");
			Namespace.RegisterClass("Class", {
				CONSTRUCTOR: function(a){cout(this.$name+".CONSTRUCTOR args: "+a)}
			});
			new(Namespace.GetClass("Class"))(100);
		}
	});

	testList.push({
		name: "namespace-class-decdef",
		desc: "Tests the namespace with class (declare-define)",
		aspects: "namespace",
		exp: ["Namespace.Subnamespace.Class.CONSTRUCTOR args: 100"],
		func: function(cout){
			let Namespace = env.CreateNamespace("Namespace.Subnamespace");
			Namespace.DeclareClass("Class", {CONSTRUCTOR: function(a){}});
			Namespace.DefineClass("Class", {
				CONSTRUCTOR: function(a){cout(this.$name+".CONSTRUCTOR args: "+a)}
			});
			new(Namespace.GetClass("Class"))(100);
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "namespace-alias",
		desc: "Tests the namespace with record",
		aspects: "namespace",
		exp: [
		"Lib.Record same as Namespace.Subnamespace.Record? yes",
		"Lib.Structure same as Namespace.Subnamespace.Structure? yes",
		"Lib.Class same as Namespace.Subnamespace.Class? yes",
		],
		func: function(cout){
			let Namespace = env.CreateNamespace("Namespace.Subnamespace");
			Namespace.RegisterRecord("Record", {dummy: 0});
			Namespace.RegisterStruct("Structure", {Variables: {dummy: 0}});
			Namespace.RegisterClass("Class", {})

			let NSRec = Namespace.GetRecord("Record");
			let NSStr = Namespace.GetStruct("Structure");
			let NSClass = Namespace.GetClass("Class");
	
			let Lib = env.CreateNamespace("Lib");
			Lib.CreateAlias(Namespace, {Record: "Record"})
			Lib.CreateAlias(Namespace, {Structure: "Structure"})
			Lib.CreateAlias(Namespace, {Class: "Class"})

			let LibRec = Lib.GetRecord("Record");
			let r = LibRec.New()

			let LibStr = Lib.GetStruct("Structure");
			let s = LibStr.New()

			let LibClass = Lib.GetClass("Class");
			let c = new LibClass;

			cout("Lib.Record same as "+NSRec.$name+"? "+(NSRec.InstanceOf(r)?"yes":"no"));
			cout("Lib.Structure same as "+NSStr.$name+"? "+(NSStr.InstanceOf(s)?"yes":"no"));
			cout("Lib.Class same as "+NSClass.$name+"? "+(NSClass.InstanceOf(c)?"yes":"no"));
		}
	});

}

TestEnvInfo.failtest_EnvNamespace = function(env, testList)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "namespace-alias",
		desc: "Tests the namespace with record",
		aspects: "namespace",
		exp: ["JEEP aborting from Namespace.CreateAlias. The record 'Record' already exists in the namespace 'Lib'."],
		func: function(cout){
			let Namespace = env.CreateNamespace("Namespace.Subnamespace");
			Namespace.RegisterRecord("Record", {dummy: 0});
			let Lib = env.CreateNamespace("Lib");
			Lib.RegisterRecord("Record", {dummy: 0});
			Lib.CreateAlias(Namespace, {Record: "Record"})
		}
	})

}

TestEnvInfo.passtest_Utils = function(env, testList)
{
	testList.push({
		name: "utils-shallow-clone",
		desc: "Tests Utils.ShallowClone",
		aspects: "utils",
		exp: [
		'{"name":"abc","count":1,"sub":{"value":-1,"text":"???"}}',
		'{"name":"abc","count":1,"sub":{"value":-1,"text":"???"}}',
		],
		func: function(cout){
			let orig = {
				name: "abc",
				count: 1,
				sub: {value: -1, text: "???"}
			}
			let clone = JEEP.Utils.ShallowClone(orig);
			cout(JSON.stringify(orig))
			cout(JSON.stringify(clone))
		}
	});

	testList.push({
		name: "utils-deep-clone-vals",
		desc: "Tests Utils.DeepClone with value only layout",
		aspects: "utils",
		exp: [
		'{"name":"abc","count":1,"sub":{"value":-1,"text":"???"}}',
		'{"name":"abc","count":1,"sub":{"value":-1,"text":"???"}}',
		"orig.sub.value -1", "clone.sub.value 100",
		],
		func: function(cout){
			let orig = {
				name: "abc",
				count: 1,
				sub: {value: -1, text: "???"}
			}
			let clone = JEEP.Utils.DeepClone(orig);
			cout(JSON.stringify(orig))
			cout(JSON.stringify(clone))
			clone.sub.value = 100;
			cout("orig.sub.value "+orig.sub.value)
			cout("clone.sub.value "+clone.sub.value)
		}
	});

	testList.push({
		name: "utils-deep-clone-funcs",
		desc: "Tests Utils.DeepClone with layout containing functions",
		aspects: "utils",
		exp: [
		'{"name":"abc","count":1,"sub":{"value":-1}}',
		'{"name":"abc","count":1,"sub":{"value":-1}}',
		"value: -1", "value: 100"
		],
		func: function(cout){
			let orig = {
				name: "abc",
				count: 1,
				sub: {
					value: -1, 
					change: function(v){this.value = v},
					print: function(){cout("value: "+this.value)}
				}
			}
			let clone = JEEP.Utils.DeepClone(orig);
			cout(JSON.stringify(orig))
			cout(JSON.stringify(clone))
			clone.sub.change(100);
			orig.sub.print();
			clone.sub.print();
		}
	});
}

TestEnvInfo.failtest_Utils = function(env, testList)
{
}

TestEnvInfo.passtest_RecStruct = function(env, testList)
{
	testList.push({
		name: "record",
		desc: "Tests everything about record (def, inst, change, equal, instanceof)",
		aspects: "record",
		exp: [
		"Shape: name: s1 height: 10 length: 20",
		"Shape: name: s2 height: 22 length: 50",
		"Shape: name: s3 height: 10 length: 20",
		"Shape: name: s1 height: 10 length: 20",
		"s1 instance of Shape? yes",
		"s2 instance of Shape? yes",
		"p instance of Person? yes",
		"s1 instance of Person? no",
		"p instance of Shape? no",
		"s1 equals s1? yes",
		"s1 equals s2? no",
		"s2 equals s1? no",
		"s1 equals p? no",
		"ob1 equals ob1? yes",
		"ob1 equals ob2? yes",
		"ob1 equals ob3? no",
		"mr1 equals mr1? yes",
		"mr1 equals mr2? no",
		"mr1 equals mr3? yes",
		],
		func: function(cout){
			env.Object.RegisterRecord("Shape", {
				length: -1,
				height: -1,
				name: "",
			});
			env.Object.RegisterRecord("Person", {name: "", age: -1});
			function print(s){
				cout("Shape: name: "+s.name+" height: "+s.height+" length: "+s.length)
			}
			let Shape = JEEP.GetRecord("Shape");
			let s1 = Shape.New({name: "s1", height: 10, length: 20})
			let s2 = Shape.New({name: "s2", height: 22, length: 50})
			let s3 = Shape.New(s1);
			let s4 = s3.Clone();// clone before change
			print(s1);
			print(s2);
			s3.Change({name: "s3"})
			print(s3);
			print(s4);
			let Person = JEEP.GetRecord("Person");
			let p = Person.New();
			cout("s1 instance of Shape? " + (Shape.InstanceOf(s1) ? "yes" : "no"))
			cout("s2 instance of Shape? " + (Shape.InstanceOf(s2) ? "yes" : "no"))
			cout("p instance of Person? " + (Person.InstanceOf(p) ? "yes" : "no"))
			cout("s1 instance of Person? " + (Person.InstanceOf(s1) ? "yes" : "no"))
			cout("p instance of Shape? " + (Shape.InstanceOf(p) ? "yes" : "no"))
			cout("s1 equals s1? " + (s1.Equal(s1) ? "yes" : "no"))
			cout("s1 equals s2? " + (s1.Equal(s2) ? "yes" : "no"))
			cout("s2 equals s1? " + (s2.Equal(s1) ? "yes" : "no"))
			cout("s1 equals p? " + (s1.Equal(p) ? "yes" : "no"))
			env.Object.RegisterRecord("ObjRecord", {
				obj: {value: 100},
				nested: {obj: {value: 999}}
			})
			let ObjRecord = JEEP.GetRecord("ObjRecord");
			let ob1 = ObjRecord.New();
			let ob2 = ObjRecord.New({obj: {value: 100}});
			let ob3 = ObjRecord.New({obj: {value: 200}});
			cout("ob1 equals ob1? " + (ob1.Equal(ob1) ? "yes" : "no"))
			cout("ob1 equals ob2? " + (ob1.Equal(ob2) ? "yes" : "no"))
			cout("ob1 equals ob3? " + (ob1.Equal(ob3) ? "yes" : "no"))
			env.Object.RegisterRecord("MultiRecord", {
				obrec: ObjRecord.New(),
			})
			let MultiRecord = JEEP.GetRecord("MultiRecord");
			let mr1 = MultiRecord.New()
			let mr2 = MultiRecord.New({obrec: ObjRecord.New({obj: {value: 333}})})
			let mr3 = mr1.Clone();
			cout("mr1 equals mr1? " + (mr1.Equal(mr1) ? "yes" : "no"))
			cout("mr1 equals mr2? " + (mr1.Equal(mr2) ? "yes" : "no"))
			cout("mr1 equals mr3? " + (mr1.Equal(mr3) ? "yes" : "no"))
		}
	});

	testList.push({
		name: "create-record",
		desc: "Uses the CreateRecord API",
		aspects: "record",
		exp: [
		"Shape: name: s height: 10 length: 20",
		"JEEP aborting from GetRecord. The record 'Shape' is not registered.",
		],
		func: function(cout){
			let Shape = env.Object.CreateRecord("Shape", {
				length: -1,
				height: -1,
				name: "",
			});
			let s = Shape.New({name: "s", height: 10, length: 20})
			cout("Shape: name: "+s.name+" height: "+s.height+" length: "+s.length)
			try{JEEP.GetRecord("Shape")}catch(e){}
		}
	});

	testList.push({
		name: "struct",
		desc: "Tests the non dogfooded aspects of struct (init constructor, Clone, Equal, InstanceOf)",
		aspects: "struct",
		exp: [
			"Struct.CONSTRUCTOR args: undefined",
			"obj.value: 100", 
			"Struct.CONSTRUCTOR args: -99",
			"obj.value: -99",
			"obj.value: 100", 
			"Struct.CONSTRUCTOR args: init",
			"obj.value: init", 
			"Struct.CONSTRUCTOR args: xinit",
			"obj.value: xinit", 
			"s1 instance of Struct? yes",
			"s3 instance of Struct? yes",
			"s1 equals s1? yes",
			"s1 equals s3? yes",
			"s1 equals s2? no",
		],
		func: function(cout){
			env.Object.RegisterStruct("Struct", {
				Variables: {obj: {value:0}},
				CONSTRUCTOR: function(a){
					cout(this.$name+".CONSTRUCTOR args: "+a)
					if(a)
						this.obj.value = a;
				},
				Functions: {
					Print: function(){cout("obj.value: "+this.obj.value)}
				}
			});
			let Struct = JEEP.GetStruct("Struct")
			let s1 = Struct.New("init", {obj: {value: 100}});
			s1.Print();
			let s2 = Struct.New(-99);
			s2.Print();
			let s3 = s1.Clone();
			s3.Print();
			let s5 = Struct.New("init");// just init!
			s5.Print();
			let s6 = Struct.New("xinit", {a: 10});// just xinit!
			s6.Print();
			cout("s1 instance of Struct? " + (Struct.InstanceOf(s1) ? "yes" : "no"))
			cout("s3 instance of Struct? " + (Struct.InstanceOf(s1) ? "yes" : "no"))
			cout("s1 equals s1? " + (s1.Equal(s1) ? "yes" : "no"))
			cout("s1 equals s3? " + (s1.Equal(s3) ? "yes" : "no"))
			cout("s1 equals s2? " + (s1.Equal(s2) ? "yes" : "no"))
		}
	});

	testList.push({
		name: "create-struct",
		desc: "Uses the CreateStruct API",
		aspects: "struct",
		exp: [
		"Struct.CONSTRUCTOR args: 100", 
		"JEEP aborting from GetStruct. The struct 'Struct' is not registered.",
		],
		func: function(cout){
			env.Object.CreateStruct("Struct", {
				Variables: {dummy:0},
				CONSTRUCTOR: function(a){cout(this.$name+".CONSTRUCTOR args: "+a)}
			}).New(100);
			try{JEEP.GetStruct("Struct")}catch(e){}
		}
	});

	testList.push({
		name: "namespace-record",
		desc: "Tests the namespace with record",
		aspects: "record, namespace",
		exp: ["Shape: name: s height: 10 length: 20",],
		func: function(cout){
			let Namespace = env.CreateNamespace("Namespace.Subnamespace");
			Namespace.RegisterRecord("Shape", {
				length: -1,
				height: -1,
				name: "",
			});
			let Shape = Namespace.GetRecord("Shape");
			let s = Shape.New({name: "s", height: 10, length: 20})
			cout("Shape: name: "+s.name+" height: "+s.height+" length: "+s.length)
		}
	});

	testList.push({
		name: "namespace-struct",
		aspects: "namespace, struct",
		desc: "Tests the namespace with class",
		exp: ["Namespace.Subnamespace.Struct.CONSTRUCTOR args: 100"],
		func: function(cout){
			let Namespace = env.CreateNamespace("Namespace.Subnamespace");
			Namespace.RegisterStruct("Struct", {
				Variables: {dummy:0},
				CONSTRUCTOR: function(a){cout(this.$name+".CONSTRUCTOR args: "+a)}
			});
			Namespace.GetStruct("Struct").New(100);
		}
	});
}

TestEnvInfo.failtest_RecStruct = function(env, testList)
{
	if(env.IsDevMode())
	{
		testList.push({
			name: "rec-def-varname",
			desc: "Tries to create a record with a reserved word",
			aspects: "record",
			exp: [
			"JEEP error in RegisterRecord for record [Shape]. The record description syntax is wrong.",
			"The record [Shape] uses the reserved word 'Change' for variable name.",
			"The record [Shape] uses the reserved word 'Equal' for variable name.",
			"The record [Shape] uses the reserved word '$name' for variable name.",
			],
			func: function(cout){
				env.Object.RegisterRecord("Shape", {
					Change: -1,
					Equal: -1,
					$name: "",
				});
			}
		});

		testList.push({
			name: "defining struct with invalid variables",
			desc: "Tests RegisterStruct.",
			aspects: "struct",
			exp: [
			"JEEP error in RegisterStruct for struct [test]. The structure description syntax is wrong.",
			"The member variable 'func' is not an object.",
			"The member variable 'func2' is set to undefined."
			],
			func: function(cout){
				env.Object.RegisterStruct("test", {
					Variables: {
						func: function(){},
						func2: undefined
					}
				});
			}
		});

		testList.push({
			name: "defining struct with invalid functions",
			desc: "Tests RegisterStruct.",
			aspects: "struct",
			exp: [
			"JEEP error in RegisterStruct for struct [test]. The structure description syntax is wrong.",
			"The member function 'func' is set to null.",
			"The member function 'func2' is not a function.",
			],
			func: function(cout){
				env.Object.RegisterStruct("test", {
					Variables: {v:0},// to avoid variable absent error
					Functions: {
						func: null,
						func2: 0,
					}
				});
			}
		});

		testList.push({
			name: "defining struct with no variables",
			desc: "Tests RegisterStruct.",
			aspects: "struct",
			exp: [
			"JEEP error in RegisterStruct for struct [Struct]. A structure cannot be defined without variables.",
			],
			func: function(cout){
				env.Object.RegisterStruct("Struct", {});
			}
		});
	}

	testList.push({
		name: "rec-init-nonexvar",
		aspects: "record",
		desc: "Tries to initiate with non existant variables of a record",
		exp: ["JEEP run time error [record Shape]. Attempted to initiate with non existant variable 'width'."],
		func: function(cout){
			env.Object.RegisterRecord("Shape", {
				length: -1,
				height: -1,
				name: "",
			});
			let Shape = JEEP.GetRecord("Shape");
			Shape.New({width: 20})
		}
	});

	testList.push({
		name: "rec-change-nonexvar",
		aspects: "record",
		desc: "Tries to change non existant variables of a record",
		exp: ["JEEP run time error [record Shape]. Attempted to change non existant variable 'width'."],
		func: function(cout){
			env.Object.RegisterRecord("Shape", {
				length: -1,
				height: -1,
				name: "",
			});
			let Shape = JEEP.GetRecord("Shape");
			let s1 = Shape.New({name: "s1", height: 10, length: 20})
			s1.Change({width: 100})
		}
	});
}

TestEnvInfo.passtest_ClassGen = function(env, testList)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "getter and setter (register)",
		desc: "Tests the getter and setter mechanism",
		aspects: "class, getter-setter",
		exp: ["GetValue: 0", "GetValue: 1"],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){},
				Variables: { $get_set$__value: 0}
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
			cout("GetValue: " + a.GetValue());
			a.SetValue(1);
			cout("GetValue: " + a.GetValue());
		}
	});
	
	testList.push({
		name: "getter and setter (declare-define)",
		aspects: "class, getter-setter",
		exp: ["c.value: 10"],
		func: function(cout){
			env.Object.DeclareClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {GetValue: function(){}, SetValue: function(v){}},
			});
			env.Object.DefineClass("Class", {
				CONSTRUCTOR: function(){},
				Variables: {$get_set$__value: 10}
			});
			let c = new (JEEP.GetClass("Class"));
			cout("c.value: "+c.GetValue());
		}
	});


	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "argtype",
		desc: "Tests arg type",
		aspects: "class, argtype",
		exp: [
		"Class.Print", "Struct.Print", "MyLib.Class.Print",
		"Class.Print", "Struct.Print", "MyLib.Class.Print",
		"Class.Print", "Struct.Print", "MyLib.Class.Print",
		"Class.Print", "Struct.Print", "MyLib.Class.Print",
		],
		func: function(cout){
			function print(){cout(this.$name+".Print")}
			env.Object.RegisterRecord("Record", {dummy: 0})
			env.Object.RegisterStruct("Struct", {Functions: {Print: print},Variables: {dummy: 0}})
			let Lib = env.CreateNamespace("MyLib")
			Lib.RegisterClass("Class", {Functions: {Print: print}})
			let Record = JEEP.GetRecord("Record");
			let Struct = JEEP.GetStruct("Struct");
			let Class = Lib.GetClass("Class");
			let C = env.Object.CreateClass("Class", {
				Functions: {
					$Print: "Array, Number, Object, String, record.Record, struct.Struct, class.MyLib.Class, ?",
					Print: function(arr, num, obj, str, rec, st, cl, x){
						cout("Class.Print")
						st.Print();
						cls.Print();
					},
				}
			})
			let c = new C;
			let r = new Record.New()
			let s = Struct.New()
			let cls = new Class;
			c.Print([1],2,{},"",r,s,cls,10)
			c.Print([1],2,{},"",r,s,cls,"")
			c.Print([1],2,{},"",r,s,cls,[])
			c.Print([1],2,{},"",r,s,cls,{})
		}
	});

	testList.push({
		name: "argtype-makefunc",
		desc: "Tests the MakeArgTypeValidated API",
		aspects: "functions-api",
		exp: ["args: abc 10"],
		func: function(cout){
			let func = env.Function.MakeArgTypeValidated(
				"String, Number",
				function test(a,b){
					cout("args: "+a+" "+b)
				});
			func("abc", 10)
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "argtype-decl-split",
		desc: "Tests arg type",
		aspects: "argtype, declare-define, class",
		exp: ["Class"],
		func: function(cout){
			env.Object.DeclareClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					$Print: "Array, Number, String",
					Print: function(a,b,c){},
				}
			})
			env.Object.DefineClass("Class", {
				CONSTRUCTOR: function(){cout("Class")},
				Functions: {
					$Print: "Array, Number, String",
					Print: function(a,b,c){},
				}
			})
			let Class = JEEP.GetClass("Class");
			new Class;
		}
	});


	testList.push({
		name: "create-class",
		desc: "Uses the CreateClass API and uses it as base class in CrBaseClass",
		aspects: "class",
		exp: [
		"BaseB.CONSTRUCTOR args: 100", 
		"BaseA.CONSTRUCTOR args: 100", 
		"Derived.CONSTRUCTOR args: 100", 
		"JEEP aborting from GetClass. The class 'Derived' is not registered."
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(a){cout("BaseA.CONSTRUCTOR args: "+a)}
			})
			let BaseB = env.Object.CreateClass("BaseB", {
				CONSTRUCTOR: function(a){cout("BaseB.CONSTRUCTOR args: "+a)}
			})
			let Derived = env.Object.CreateClass("Derived", {
				BaseClass: "BaseA",
				CrBaseClass: [BaseB],
				CONSTRUCTOR: function(a){cout("Derived.CONSTRUCTOR args: "+a)}
			})
			new Derived(100)
			try{JEEP.GetClass("Derived")}catch(e){}
		}
	});

	testList.push({
		name: "gen-no-ctor-reg",
		desc: "A class with no constructor (register)",
		aspects: "class, generation",
		exp: [],// nothing expected},
		func: function(cout){
			env.Object.RegisterClass("Class", {});
			TestEnvInfo.simpleTester("Class")
		}
	});

	testList.push({
		name: "gen-no-ctor-decdef",
		desc: "A class with no constructor (declare-define)",
		aspects: "class, generation, declare-define",
		exp: [],// nothing expected},
		func: function(cout){
			env.Object.DeclareClass("Class", {});
			env.Object.DefineClass("Class", {});
			TestEnvInfo.simpleTester("Class")
		}
	});

	testList.push({
		name: "gen-ctor-reg",
		desc: "Tests if constructor is called (register)",
		exp: ["Class.CONSTRUCTOR args: 100"],
		aspects: "class",
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(a){cout(this.$name+".CONSTRUCTOR args: "+a)}
			});
			new(JEEP.GetClass("Class"))(100);
		}
	});
	
	testList.push({
		name: "gen-ctor-decdef",
		desc: "Tests if constructor is called (declare-define)",
		exp: ["Class.CONSTRUCTOR args: 100"],
		aspects: "class",
		func: function(cout){
			env.Object.DeclareClass("Class", {CONSTRUCTOR: function(a){}});
			env.Object.DefineClass("Class", {
				CONSTRUCTOR: function(a){cout(this.$name+".CONSTRUCTOR args: "+a)}
			});
			new(JEEP.GetClass("Class"))(100);
		}
	});

	testList.push({
		name: "init-ctor",
		desc: "Using init constructor with internal access flag to test that it does't raise error",
		exp: ["args: undefined", "name: unknown age: 100"],
		aspects: "class, constructor",
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(a){
					cout("args: "+a)
					cout("name: "+this.GetName()+" age: "+this.GetAge())					
				},
				Variables: {
					$get$__name: "?",
					$get$__age: 0,
				}
			});
			let Class = JEEP.GetClass("Class");
			new Class("init", {name: "unknown", age: 100})
		}
	});

	testList.push({
		name: "init-ctor-hier",
		desc: "Using init constructor in hierarchy",
		aspects: "class, constructor",
		exp: [
		"args: undefined", 
		"name: unknown age: 100",
		"args: undefined", 
		"city: unknown",
		],
		func: function(cout){
			let Base = env.Object.CreateClass("Base", {
				CONSTRUCTOR: function(a){
					cout("args: "+a)
					cout("name: "+this.GetName()+" age: "+this.GetAge())					
				},
				Variables: {
					$get$__name: "?",
					$get$__age: 0,
				}
			});
			let Derived = env.Object.CreateClass("Derived", {
				CrBaseClass: [Base],
				CONSTRUCTOR: function(a){
					cout("args: "+a)
					cout("city: "+this.GetCity())					
				},
				Variables: {
					$get$__city: "?",
				}
			});
			
			new Derived("init", {name: "unknown", age: 100, city: "unknown"})
		}
	});

	testList.push({
		name: "gen-memfv-reg",
		desc: "Tests the setup of member variables and functions (register)",
		exp: ["Class.SomeFunction value: 100 Object.value: 100"],
		aspects: "class",
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					SomeFunction: function(){
						cout(this.$name+".SomeFunction value: "+this.val+" Object.value: "+this.obj.val)
					}
				},
				Variables: {
					val: 100,
					obj: {val: 100}
				}
			});
			TestEnvInfo.simpleTester("Class", ["SomeFunction"])
		}
	});
	
	testList.push({
		name: "gen-memfv-decdef",
		desc: "Tests the setup of member variables and functions (declare-define)",
		exp: ["Class.SomeFunction value: 100 Object.value: 100"],
		aspects: "class, declare-define",
		func: function(cout){
			env.Object.DeclareClass("Class", {
				Functions: {SomeFunction: function () {}}
			});
			env.Object.DefineClass("Class", {
				Functions: {SomeFunction: function(){
					cout(this.$name+".SomeFunction value: "+this.val+" Object.value: "+this.obj.val)
				}},
				Variables: {
					val: 100,
					obj: {val: 100}
				}
			});
			TestEnvInfo.simpleTester("Class", ["SomeFunction"])
		}
	});

	testList.push({
		name: "copyctor",
		desc: "Tests the copy constructor mechanism",
		aspects: "class, constructor",
		exp: ["Class.SomeFunction value: 100", "Class.SomeFunction value: 100"],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(a, b){this.val = a*b},
				Functions: {SomeFunction: function(){
					cout(this.$name+".SomeFunction value: "+this.val)
				}},
				Variables: {val: -1},
			});
			let Def = JEEP.GetClass("Class");
			let d = new Def(5, 20);
			d.SomeFunction();
			d2 = new Def(d);
			d2.SomeFunction();
		}
	});

	testList.push({
		name: "gen-inst-vars",
		desc: "Tests that member variable is unique per instance, even when it is an instance of another class",
		aspects: "class, instance",
		exp: [	
			"Class.SomeFunction value: 10 Object.value: 10",
			"Inner.SomeFunction value: 100",
			"Class.SomeFunction value: 20 Object.value: 20",
			"Inner.SomeFunction value: 200",
			"Class.SomeFunction value: 333 Object.value: 333",
			"Inner.SomeFunction value: 333",
			"Class.SomeFunction value: 777 Object.value: 777",
			"Inner.SomeFunction value: 777",
		],
		func: function(cout){
			env.Object.RegisterClass("Inner", {
				CONSTRUCTOR: function(val){this.val = val},
				Functions: {
					SomeFunction: function(){cout(this.$name+".SomeFunction value: "+this.val)},
					Change: function(v){this.val = v}
				}
			});
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(v, ob, ins){
					this.val = v;
					this.obj = ob;
					this.ins = new(JEEP.GetClass("Inner"))(ins);
				},
				Functions: {
					SomeFunction: function(){
						cout(this.$name+".SomeFunction value: "+this.val+" Object.value: "+this.obj.val);
						this.ins.SomeFunction();
					},
					Change: function(v){
						this.val = v;
						this.obj.val = v;
						this.ins.Change(v)
					}
				},
				Variables: {
					val: -1,
					obj: {val: -1},
					ins: null,
				}
			});
			let Def = JEEP.GetClass("Class");
			let Inner = JEEP.GetClass("Inner");
			let d1 = new Def(10, {val: 10}, new Inner(100));
			let d2 = new Def(20, {val: 20}, new Inner(200));
			d1.SomeFunction();
			d2.SomeFunction();
			d1.Change(333);
			d2.Change(777);
			d1.SomeFunction();
			d2.SomeFunction();
		}
	});

	testList.push({
		name: "sametype",
		desc: "Tests the SameType function",
		aspects: "class, instance",
		exp: ["Same type: object", "Different type: number", "Different type: object"],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Functions: {Test: function(c){
					cout((this.$def.InstanceOf(c)?"Same":"Different")+" type: "+typeof c);
				}}
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
			a.Test(new A);
			a.Test(10);
			env.Object.RegisterClass("Class2", {});
			a.Test(new (JEEP.GetClass("Class2")));
		}
	});

	testList.push({
		name: "gen-static-reg",
		desc: "Tests the setup of member variables and functions and their access (register)",
		aspects: "class, static",
		exp: [	
			"Class.StaticFunction reading static value: 100",
			"Class.StaticFunction calling AnotherStaticFunction",
			"Class.AnotherStaticFunction reading static value: 100",
			"Class.MemberFunction reading static value: 100",
			"Class.MemberFunction calling StaticFunction",
			"Class.StaticFunction reading static value: 100",
			"Class.StaticFunction calling AnotherStaticFunction",
			"Class.AnotherStaticFunction reading static value: 100",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Functions: {
					MemberFunction: function(){
						cout(this.$name+".MemberFunction reading static value: "+this.$def.value)
						cout(this.$name+".MemberFunction calling StaticFunction")
						this.$def.StaticFunction();
					}
				},
				Static: {
					value: 100,
					StaticFunction: function(){
						cout(this.$name+".StaticFunction reading static value: "+this.value)
						cout(this.$name+".StaticFunction calling AnotherStaticFunction")
						this.AnotherStaticFunction();
					},
					AnotherStaticFunction: function(){cout(this.$name+".AnotherStaticFunction reading static value: "+this.value)}
				},
			});
			let Class = JEEP.GetClass("Class");
			Class.StaticFunction();
			TestEnvInfo.simpleTester("Class", ["MemberFunction"])
		}
	});

	testList.push({
		name: "gen-static-decdef",
		desc: "Tests the setup of member variables and functions and their access (declare-define)",
		aspects: "class, static, declare-define",
		exp: [	
			"Class.StaticFunction reading static value: 100",
			"Class.StaticFunction calling AnotherStaticFunction",
			"Class.AnotherStaticFunction reading static value: 100",
			"Class.MemberFunction reading static value: 100",
			"Class.MemberFunction calling StaticFunction",
			"Class.StaticFunction reading static value: 100",
			"Class.StaticFunction calling AnotherStaticFunction",
			"Class.AnotherStaticFunction reading static value: 100",
		],
		func: function(cout){
			env.Object.DeclareClass("Class", {Functions: {MemberFunction: function(){}}});
			env.Object.DefineClass("Class", {
				Functions: {
					MemberFunction: function(){
						cout(this.$name+".MemberFunction reading static value: "+this.$def.value)
						cout(this.$name+".MemberFunction calling StaticFunction")
						this.$def.StaticFunction();
					}
				},
				Static: {
					value: 100,
					StaticFunction: function(){
						cout(this.$name+".StaticFunction reading static value: "+this.value)
						cout(this.$name+".StaticFunction calling AnotherStaticFunction")
						this.AnotherStaticFunction();
					},
					AnotherStaticFunction: function(){cout(this.$name+".AnotherStaticFunction reading static value: "+this.value)}
				},
			});
			let Class = JEEP.GetClass("Class");
			Class.StaticFunction();
			TestEnvInfo.simpleTester("Class", ["MemberFunction"])
		}
	});

	testList.push({
		name: "hier-siml-reg",
		desc: "Tests the single inheritance mechanism (register)",
		aspects: "class, single-inheritance",
		exp: ["Base.CONSTRUCTOR", "Derived.CONSTRUCTOR"],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){cout("Base.CONSTRUCTOR")}
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "Base",
				CONSTRUCTOR: function(){cout("Derived.CONSTRUCTOR")}
			});
			TestEnvInfo.simpleTester("Derived");
		}
	});

	testList.push({
		name: "hier-siml-decdef",
		desc: "Tests the single inheritance mechanism (declare-define)",
		aspects: "class, single-inheritance, declare-define",
		exp: ["Base.CONSTRUCTOR", "Derived.CONSTRUCTOR"],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){cout("Base.CONSTRUCTOR")}
			});
			env.Object.DeclareClass("Derived", {
				BaseClass: "Base",
				CONSTRUCTOR: function(){}
			});
			env.Object.DefineClass("Derived", {
				CONSTRUCTOR: function(){cout("Derived.CONSTRUCTOR")}
			});
			TestEnvInfo.simpleTester("Derived");
		}
	});

	testList.push({
		name: "hier-siml-ctors",
		desc: "Tests the default constructor mechanism (single inheritance multiple level)",
		aspects: "class, single-inheritance, constructor",
		exp: ["TopBase.CONSTRUCTOR 100", "MidBase.CONSTRUCTOR 100", "Derived.CONSTRUCTOR 100", "this.$base absent"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(a){cout("TopBase.CONSTRUCTOR "+a)}
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
				CONSTRUCTOR: function(a){cout("MidBase.CONSTRUCTOR "+a)}
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "MidBase",
				CONSTRUCTOR: function(a){
					cout("Derived.CONSTRUCTOR "+a)
					cout("this.$base " + (this.$base ? "present" : "absent"))
				}
			});
			new(JEEP.GetClass("Derived"))(100);
		}
	});

	testList.push({
		name: "hier-siml-ctors-manual",
		aspects: "class, single-inheritance, constructor",
		desc: "Tests the manual base constructor mechanism (single inheritance multiple level)",
		exp: ["MidBase.CONSTRUCTOR", "Derived.CONSTRUCTOR", "TopBase.CONSTRUCTOR", "this.$base present"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(){cout("TopBase.CONSTRUCTOR")}
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
				CONSTRUCTOR: function(){cout("MidBase.CONSTRUCTOR")}
			});
			env.Object.RegisterClass("Derived", {
				Flags: "manual-base-construction",
				BaseClass: "MidBase",
				CONSTRUCTOR: function(){
					this.$base.MidBase.CONSTRUCTOR();
					cout("Derived.CONSTRUCTOR")
					this.$base.TopBase.CONSTRUCTOR();
					cout("this.$base " + (this.$base ? "present" : "absent"))
				}
			});
			TestEnvInfo.simpleTester("Derived");
		}
	});

	testList.push({
		name: "hier-siml-memvars",
		aspects: "class, single-inheritance",
		desc: "Tests the variables and functions setup (single inheritance multiple level)",
		exp: ["TopBase.tbvalue: 10", "MidBase.mbvalue: 20", "Derived.value: 30"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {TBPrint: function(){cout("TopBase.tbvalue: "+this.tbvalue)}},
				Variables: {tbvalue: 10}
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
				Functions: {MBPrint: function(){cout("MidBase.mbvalue: "+this.mbvalue)}},
				Variables: {mbvalue: 20}
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "MidBase",
				Functions: {
					Print: function(){
						this.TBPrint();
						this.MBPrint();
						cout("Derived.value: "+this.value)
					}
				},
				Variables: {value: 30}
			});
			TestEnvInfo.simpleTester("Derived", ["Print"]);
		}
	});

	testList.push({
		name: "hier-siml-virt",
		aspects: "class, single-inheritance, virtual",
		desc: "Tests the virtual function setup with multiple instances (single inheritance multiple level)",
		exp: [	
			"--- testing the mechanism",
			"TopBase.GetTopVirtualName: Derived", 
			"TopBase.GetTopMidVirtualName: MidBase", 
			"MidBase.GetMidVirtualName: Derived",
			"--- testing the instance uniqueness",
			"TopBase value: 100", "MidBase value: 100", "Derived value: 100",
			"TopBase value: 200", "MidBase value: 200", "Derived value: 200",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(v){this.tbvalue = v},
				Functions: {
					PrintTbValue: function(){cout("TopBase value: "+this.tbvalue)},
					GetTopVirtualName: function(){cout("TopBase.GetTopVirtualName: "+this.getTopVirtualName())},
					GetTopMidVirtualName: function(){cout("TopBase.GetTopMidVirtualName: "+this.getTopMidVirtualName())},
					$virtual$__getTopVirtualName: function(){return "TopBase"},
					$virtual$__getTopMidVirtualName: function(){return "TopBase"},
				},
				Variables: {tbvalue: -1}
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
				CONSTRUCTOR: function(v){this.mbvalue = v},
				Functions: {
					PrintMbValue: function(){cout("MidBase value: "+this.mbvalue)},
					GetMidVirtualName: function(){cout("MidBase.GetMidVirtualName: "+this.getMidVirtualName())},
					$virtual$__getTopVirtualName: function(){return "MidBase"},
					$virtual$__getTopMidVirtualName: function(){return "MidBase"},
					$virtual$__getMidVirtualName: function(){return "MidBase"},
				},
				Variables: {mbvalue: -1}
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "MidBase",
				CONSTRUCTOR: function(v){this.value = v},
				Functions: {
					TestValue: function(){
						this.PrintTbValue();
						this.PrintMbValue();
						cout("Derived value: "+this.value)
					},
					TestName: function(){
						this.GetTopVirtualName();
						this.GetTopMidVirtualName();
						this.GetMidVirtualName();
					},
					$virtual$__getTopVirtualName: function(){return "Derived"},
					$virtual$__getMidVirtualName: function(){return "Derived"}
				},
				Variables: {value: -1}
			});
			let Derived = JEEP.GetClass("Derived");
			let d1 = new Derived(100);
			cout("--- testing the mechanism")
			d1.TestName();
			let d2 = new Derived(200);
			cout("--- testing the instance uniqueness")
			d1.TestValue();
			d2.TestValue();
		}
	});

	testList.push({
		name: "def-rep-decdef",
		aspects: "class, single-inheritance, virtual, declare-define",
		desc: "The directive replace is not used in declare but used in define as per rules",
		exp: ["Class.CONSTRUCTOR"],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Functions: {
					$virtual$__GetName: function(){},
				}			
			})
			env.Object.DeclareClass("Class", {
				BaseClass: "Base",
				CONSTRUCTOR: function(){},
				Functions: {
					$virtual$__GetName: function(){},
				}
			});				
			env.Object.DefineClass("Class", {
				CONSTRUCTOR: function(){cout("Class.CONSTRUCTOR")},
				Functions: {
					$virtual_replace$__GetName: function(){},
				}
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
		}
	});
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "pub-prot-priv",
		aspects: "class, public, protected, private",
		desc: "A class with all three privilage levels",
		exp: [
		"private value: -33", "protected value: 100"
		],
		func: function(cout){
			let Class = env.Object.CreateClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					$usepriv$__Test: function(){
						this.$.PrintPrivValue();
						this.$$.PrintProtValue();
					}
				},
				Protected: {
					value: 100,
					$usepriv$__PrintPrivValue: function(){cout("private value: "+ this.$$.value)},
				},
				Private: {
					value: -33,
					PrintProtValue: function(){cout("protected value: "+ this.$.value)},
				}
			});
			let c = new Class;
			c.Test();
		}
	});

}

TestEnvInfo.failtest_ClassGen = function(env, testList)
{
	if(env.IsDevMode())
	{
		testList.push({
			name: "invalid class description property",
			desc: "",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The class description information 'memevars' is invalid."
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {func: function(){;}},
					memevars: {value: 0},
				});				
			}
		});

		// testList.push({
		// 	name: "class with no interface",
		// 	desc: "",
		// 	exp: [
		// 	"JEEP couldn't generate the class [Class] due to the following errors.",
		// 	"The class has no utility as it has neither interface functions nor private variables."
		// 	],
		// 	func: function(cout){
		// 		DevEnv.Object.RegisterClass("Class", {
		// 			CONSTRUCTOR: function(){},
		// 		});				
		// 	}
		// });

		// testList.push({
		// 	name: "class with empty functions",
		// 	desc: "",
		// 	exp: [
		// 	"JEEP couldn't generate the class [Class] due to the following errors.",
		// 	"The class has no utility as it has neither interface functions nor private variables."
		// 	],
		// 	func: function(cout){
		// 		DevEnv.Object.RegisterClass("Class", {
		// 			CONSTRUCTOR: function(){},
		// 			Functions: {f: function(){}},
		// 			Static: {f: function(){}},
		// 		});				
		// 	}
		// });

		testList.push({
			name: "invalid variable and function",
			desc: "",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The member variable 'value' is not an object.",
			"The member function 'func' is not a function.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {func: 10},
					Variables: {value: function(){}},
				});				
			}
		});

		testList.push({
			name: "member variables declared in declare-define",
			desc: "",
			exp: [
			"JEEP error in DeclareClass for class [Class]. Member variables are not allowed to be declared.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Variables: {value: 0},
				});				
			}
		});

		testList.push({
			name: "static variables declared in declare-define",
			desc: "",
			exp: [
			"JEEP error in DeclareClass for class [Class]. Static variables are not allowed to be declared.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Static: {value: 0},
				});				
			}
		});

		testList.push({
			name: "member function null (register)",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The member function 'func' is set to null.",
			"The member function '$virtual$__Print' is set to null.",
			"The member function '$abstract$__doPrint' is set to null.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){cout(this.$name)},
					Functions: {
						func: null, 
						$virtual$__Print: null, 
						$abstract$__doPrint: null 
					},
				});
			}
		});

		testList.push({
			name: "getter and setter when such funtions are defined",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"Unable to generate the getter for the variable 'value' as the function 'GetValue' already exists.",
			"Unable to generate the setter for the variable 'value' as the function 'SetValue' already exists.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){cout(this.$name)},
					Functions: {GetValue: function(){}, SetValue: function(){}},
					Variables: {$get_set$__value: 0}
				});Variables: {$get_set$__value: 0}
			}
		});

		testList.push({
			name: "BaseClass defined (declare-define)",
			desc: "",
			exp: [
			"JEEP error in DefineClass for class [Class]. BaseClass must be declared, not defined.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {GetName: function(){}}
				});				
				env.Object.DefineClass("Class", {
					BaseClass: "Dummy",
					CONSTRUCTOR: function(){},
					Functions: {GetName: function(){}}
				});
				let A = JEEP.GetClass("Class");
				let a = new A;
			}
		});

		testList.push({
			name: "def-rep-nobase",
			desc: "Using the directive replace in a class with no bases",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The class [Class] does not have base classes but uses the directive 'replace' for the function 'GetName'.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {
						$virtual_replace$__GetName: function(){},
					}
				});				
			}
		});

		testList.push({
			name: "def-rep-nobase-virt",
			desc: "Using the directives replace for class whose base do't have the said virtual function",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The class [Class] replaces the virtual function 'GetName' though it is not present in any of its bases.",
			],
			func: function(cout){
				env.Object.RegisterClass("Base", {})
				env.Object.RegisterClass("Class", {
					BaseClass: "Base",
					CONSTRUCTOR: function(){cout("Class.CONSTRUCTOR")},
					Functions: {
						$virtual_replace$__GetName: function(){},
					}
				});
			}
		});

		// testList.push({
		// 	name: "def-private-nousepriv",
		// 	desc: "Using private members but not using them (no function with usepriv directive)",
		// 	exp: [
		// 	"JEEP error in RegisterClass for class [Class]. The class declares private members but does not use them."
		// 	],
		// 	func: function(cout){
		// 		env.Object.RegisterClass("Class", {
		// 			CONSTRUCTOR: function(){cout("Class.CONSTRUCTOR")},
		// 			Private: {
		// 				value: 0,
		// 			},
		// 			Functions: {
		// 				$virtual_replace$__GetName: function(){},
		// 			}
		// 		});
		// 	}
		// });

		testList.push({
			name: "def-noprivate-using",
			desc: "Using private members but not using them (no function with usepriv directive)",
			exp: [
			"JEEP error in RegisterClass for class [Class]. The class declares usage of non existing private members."
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					Flags: "using-private-members",
					CONSTRUCTOR: function(){cout("Class.CONSTRUCTOR")},
					Functions: {
						GetName: function(){},
					}
				});
			}
		});

		testList.push({
			name: "def-rep-usepriv-decl",
			desc: "Using the directives replace and usepriv in declare (declare-define)",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'Test' uses the directive 'usepriv' which is not allowed in declare as it is an implementation detail.",
			"The function 'GetName' uses the directive 'replace' which is not allowed in declare as it is an implementation detail.",
			],
			// this test doesn't show error for replace in non derived class because that validation is done in define, 
			// but declare aborts when it finds errors.
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {
						$usepriv$_Test: function(){},
						$virtual_replace$__GetName: function(){},
					}
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {
						$usepriv$_Test: function(){},
						$virtual_replace$__GetName: function(){},
					}
				});
			}
		});

		testList.push({
			name: "getter and setter wrong length (declare-define)",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The argument count for the function 'SetValue' is declared as 0 but defined as 1.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {GetValue: function(){}, SetValue: function(){}},
				});
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Variables: {$get_set$__value: 10}
				});
				let c = new (JEEP.GetClass("Class"));
				cout("c.value: "+c.GetValue());
			}
		});

		testList.push({
			name: "variable getter setter not declared (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The getter for the variable 'value' is defined but not declared.",
			"The setter for the variable 'value' is defined but not declared.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {Print: function(){}}
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {Print: function(){}},
					Variables: {$get_set$__value: 0}
				});
			}
		});

		testList.push({
			name: "getter and setter directive typo (declare-define)",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The directive 'sset' for the variable 'value' is invalid.",
			"The function 'GetValue' is declared but not defined.",
			"The function 'SetValue' is declared but not defined.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {GetValue: function(){}, SetValue: function(){}},
				});
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Variables: {$get_sset$__value: 10}
				});
				let c = new (JEEP.GetClass("Class"));
				cout("c.value: "+c.GetValue());
			}
		});

		testList.push({
			name: "constructor not declared but defined",
			desc: "",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'CONSTRUCTOR' is defined but not declared."
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {});
				env.Object.DefineClass("Class", {CONSTRUCTOR: function(){cout("Class.CONSTRUCTOR")}});
				let A = JEEP.GetClass("Class");
				new A;
			}
		});

		testList.push({
			name: "constructor declared but not defined (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'CONSTRUCTOR' is declared but not defined.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
				});				
				env.Object.DefineClass("Class", {
					Functions: {Dummy: function(){}},// to avoid 'no interface' error
				});
			}
		});

		testList.push({
			name: "GetValue declared but not defined (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'GetValue' is declared but not defined.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {GetValue: function(){}, SetValue: function(v){}},
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Variables: {$set$__value: 0}
				});
			}
		});

		testList.push({
			name: "SetValue declared but not defined (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'SetValue' is declared but not defined.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {GetValue: function(){}, SetValue: function(v){}},
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Variables: {$get$__value: 0}
				});
			}
		});

		testList.push({
			name: "constructor parameters mismatch (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The argument count for the function 'CONSTRUCTOR' is declared as 2 but defined as 1.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(a,b){},
					Functions: {Dummy: function(){}},// to avoid 'no interface' error
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(a){},
					Functions: {Dummy: function(){}},// to avoid 'no interface' error
				});
			}
		});

		testList.push({
			name: "member and static functions declared but not defined (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'GetName' is declared but not defined.",
			"The function 'PrintName' is declared but not defined.",
			"The function 'StatPrint' is declared but not defined.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {
						$virtual$__GetName: function(){},
						PrintName: function(){}
					},
					Static: {StatPrint: function(){}},
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
				});
			}
		});

		testList.push({
			name: "function declared virtual but not defined virtual (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'GetName' is declared as 'virtual' but defined as '<no directives>'.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {$virtual$__GetName: function(){}}
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {GetName: function(){}}
				});
			}
		});

		testList.push({
			name: "function not declared virtual but defined virtual (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'GetName' is declared as '<no directives>' but defined as 'virtual'.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {GetName: function(){}}
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {$virtual$__GetName: function(){}}
				});
			}
		});

		testList.push({
			name: "function argument count mismatch (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The argument count for the function 'Print' is declared as 0 but defined as 1.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {Print: function(){}}
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {Print: function(what){}}
				});
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "function directives mismatch (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'Print' is declared as 'argconst_argnum_const' but defined as '<no directives>'."
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {$const_argconst_argnum$__Print: function(){}}
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {Print: function(){}}
				});
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "abstract function argument count mismatch (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The argument count for the abstract function 'GetName' is declared as 1 in base class [Base] but as 2 in derived class [Derived].",
			],
			func: function(cout){
				env.Object.DeclareClass("Base", {
					CONSTRUCTOR: function(){},
					Functions: {$abstract$__GetName: function(a){}}
				});				
				env.Object.DefineClass("Base", {
					CONSTRUCTOR: function(){},
				});
				env.Object.RegisterClass("Derived", {
					CONSTRUCTOR: function(){},
					BaseClass: "Base",
					Functions: {$virtual$__GetName: function(a, b){}},
				});
			}
		});
		
		testList.push({
			name: "function with code in declare (declare-define)",
			desc: "as the name indicates.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The member function 'Print' spans lines or contains implementation.",
			"The member function 'Print2' spans lines or contains implementation.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {
						Print: function(what, where){cout(what + where)},
						Print2: function(what, where){;},
					}
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
				});
			}
		});

		testList.push({
			name: "function directive validation",
			desc: "Tests that certain directives can't be used together.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'Func1' uses both 'virtual' and 'abstract' directives.",
			"The abstract function 'Func2' uses extra directives.",
			"The abstract function 'Func3' uses extra directives.",
			"The function 'Func3' is not virtual but uses the 'replace' directive.",
			"The abstract function 'Func4' uses extra directives.",
			"The function 'Func5' is not virtual but uses the 'replace' directive.",
			"The function 'Func6' is not virtual but uses the 'replace' directive.",
			"The class [Class] does not have base classes but uses the directive 'replace' for the function 'Func3'.",
			"The class [Class] does not have base classes but uses the directive 'replace' for the function 'Func5'.",
			"The class [Class] does not have base classes but uses the directive 'replace' for the function 'Func6'.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					DESTRUCTOR: function(){},// due to scoped function
					Functions: {
						$abstract_virtual$__Func1: function(){},
						$abstract_scoped$__Func2: function(){},
						$abstract_replace$__Func3: function(){},
						$abstract_usepriv$__Func4: function(){},
						$replace_const$__Func5: function(){},
						$replace$__Func6: function(){},
					},
					Private: {
						dummy: 0,// to avoid private not used error
					}
				});
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "static functions with directives",
			desc: "",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The static function 'Abs' is declared abstract.",
			"The static function 'Vir' is declared virtual.",
			"The static function 'Const' is declared constant.",
			"The static function 'VirtualReplace' is declared virtual and replace.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					DESTRUCTOR: function(){cout("Class.DESTRUCTOR")},
					Static: {
						$abstract$__Abs: function(obj){},
						$virtual$__Vir: function(obj){},
						$const$__Const: function(obj){},
						$virtual_replace$__VirtualReplace: function(obj){},
					},
				});	
			}
		});		
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "argtype-decl",
			desc: "Tests arg type",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'Print' uses invalid type 'Nu' for the argument 1.",
			"The function 'Print' uses invalid type 'ber' for the argument 2.",
			"The function 'Print' uses invalid type 'Stying' for the argument 3.",
			"The function 'Print' declares 3 number of arguments but declares type for 1.",
			"The function 'Search' declares 3 number of arguments but declares type for 1.",
			"Argument type information is declared for a non existing function 'Replace'."
			],
			func: function(cout){
				let C = env.Object.CreateClass("Class", {
					Functions: {
						$Print: "Array, Nu,ber, Stying",
						Print: function(a,b,c){},
						$Search: "String",
						Search: function(a,b,c){},
						$Replace: "Array",
					}
				})
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "argtype-decl-split",
			desc: "Tests arg type",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The argument type for the function 'Print' is declared as 'Array,Number,String' but defined as '<none>'.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					Functions: {
						$Print: "Array, Number, String",
						Print: function(a,b,c){},
					}
				})
				env.Object.DefineClass("Class", {
					Functions: {
						Print: function(a,b,c){},
					}
				})
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "argtype-mismatch-baseder",
			desc: "Tests arg type",
			exp: [
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The argument type for the function 'Print' is declared as 'Array,Number,String' in base class [Base] but as 'Number,Number,String' in derived class [Derived].",
			],
			func: function(cout){
				let Base = env.Object.CreateClass("Base", {
					Functions: {
						$Print: "Array, Number, String",
						$virtual$__Print: function(a,b,c){},
					}
				})
				let Derived = env.Object.CreateClass("Derived", {
					CrBaseClass: [Base],
					Functions: {
						$Print: "Number, Number, String",
						$virtual$__Print: function(a,b,c){},
					}
				})
			}
		});
		testList.push({
			name: "virt-robdir-binding",
			desc: "The romustness directives on virtual and abstract functions are binding on derived class",
			exp: [
				"JEEP couldn't generate the class [Derived] due to the following errors.",
				"The virtual function 'VirtualFunction' is declared as 'const_virtual' in base class [Base] but as 'virtual' in derived class [Derived].",
				"The virtual function 'AbstractFunction' is declared as 'const_virtual' in base class [Base] but as 'virtual' in derived class [Derived].",
			],
			func: function(cout){
				env.Object.RegisterClass("Base", {
					CONSTRUCTOR: function(){},
					Functions: {
						$virtual_const$__VirtualFunction: function(){},
						$abstract_const$__AbstractFunction: function(){},
					}
				});
				env.Object.RegisterClass("Derived", {
					BaseClass: "Base",
					CONSTRUCTOR: function(){},
					Functions: {
						$virtual$__VirtualFunction: function(){},
						$virtual$__AbstractFunction: function(){}
					}
				});
			}
		});

		testList.push({
			name: "def-abs-reg",
			desc: "A class has non empty abstract function (register method)",
			exp: [	
				"JEEP couldn't generate the class [Class] due to the following errors.",
				"The abstract function 'SomeFunction' spans lines or contains implementation.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {$abstract$__SomeFunction: function(){;}}
				});
			}
		});

		testList.push({
			name: "def-abs-decdef",
			desc: "A class has non empty abstract function (declare-define method)",
			exp: [	
				"JEEP couldn't generate the class [Class] due to the following errors.",
				"The abstract function 'SomeFunction' is implemented in the same class.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {$abstract$__SomeFunction: function(){}}
				});				
				env.Object.DefineClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {$abstract$__SomeFunction: function(){}}
				});
			}
		});
	}

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "function directives combination (without virtual)",
		desc: "Tests  abbreviated function directives.",
		exp: [
		"Class CONSTRUCTOR", 
		"Class CONSTRUCTOR", "scope and nothing", "Class DESTRUCTOR",
		"Class CONSTRUCTOR", "scope and const", 
		"JEEP run time error [class Class]. The function 'Print' is declared constant but tried to modify the variable 'value'.",
		"Class DESTRUCTOR",
		"Class CONSTRUCTOR", "scope and argconst", "Class DESTRUCTOR", "m.modArg: true",
		"JEEP run time error [class Class]. The function 'Print' is declared to take 3 arguments but invoked with 1.",
		"Class CONSTRUCTOR", "scope and replace", "Class DESTRUCTOR", "this.$base is undefined",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){cout("Class CONSTRUCTOR")},
				DESTRUCTOR: function(){cout("Class DESTRUCTOR")},
				Functions: {
					$scoped_const_argconst_argnum$___Print: function(what, which, f){
						this.$def.ScopedCreate();
						cout(what +" and "+ which);
						if(f)
						{
							if(f.modArg)
								f.modArg = false;
							else if(f.modObject)
								this.value = 0;
							else if(f.callBase)
								this.$base.Base.Print(what, which, f);
						}
					},
				},
				Variables: {value: 0},
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
			// scope only
			a.Print("scope", "nothing", null);
			// scope + test const
			try{a.Print("scope", "const", {modObject: true});}catch(e){}
			// scope + test argconst
			let m = {modArg: true};
			a.Print("scope", "argconst", m);
			cout("m.modArg: " +(m.modArg?"true":"false"));
			// test argnum
			try{a.Print("scope");}catch(e){}
			// test replace
			try{a.Print("scope", "replace", {callBase: true});}catch(e){cout(e.message)}
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "argtype",
		desc: "Tests arg type (count, arr, num, rec, struct, class)",
		exp: [
		"JEEP run time error [class Class]. The function 'Print' expects 5 number of argument(s).",
		"JEEP run time error [class Class]. The function 'Print' expects 'number' type for argument 0.",
		"JEEP run time error [class Class]. The function 'Print' expects 'array' type for argument 1.",
		"JEEP run time error [class Class]. The function 'Print' expects 'record Record' type for argument 2 but it is not registered.",
		"JEEP run time error [class Class]. The function 'Print' expects 'struct Struct' type for argument 3 but it is not registered.",
		"JEEP run time error [class Class]. The function 'Print' expects 'class Class' type for argument 4 but it is not registered.",
		],
		func: function(cout){
			let C = env.Object.CreateClass("Class", {
				Functions: {
					$Print: "Number, Array, record.Record, struct.Struct, class.Class",
					Print: function(num, arr, rec, str, cls){}
				}
			})
			let c = new C;
			try{c.Print()}catch(e){}
			try{c.Print("a")}catch(e){}
			try{c.Print(1,2)}catch(e){}
			try{c.Print(1,[2],3)}catch(e){}
			env.Object.RegisterRecord("Record", {dummy: 0})
			let Record = JEEP.GetRecord("Record");
			try{c.Print(1,[2],Record.New(), 4)}catch(e){}
			env.Object.RegisterStruct("Struct", {Variables: {dummy: 0}})
			let Struct = JEEP.GetStruct("Struct");
			try{c.Print(1,[2],Record.New(), Struct.New(), 5)}catch(e){}
		}
	});

	testList.push({
		name: "argtype-makefunc",
		desc: "Uses the MakeArgTypeValidated API",
		exp: ["JEEP run time error [class <unknown>]. The function 'test' expects 'string' type for argument 0.",],
		func: function(cout){
			let func = env.Function.MakeArgTypeValidated(
				"String, Number",
				function test(a,b){
					cout("args: "+a+" "+b)
				});
			func(10, "abc", 10)
		}
	});

	testList.push({
		name: "argtype-makefunc-decl",
		desc: "Uses the MakeArgTypeValidated API",
		exp: [
		"JEEP aborting due to the following errors in MakeArgTypeValidated.",
		"The function '<unknown>' uses invalid type 'Striing' for the argument 0.",		
		],
		func: function(cout){
			let func = env.Function.MakeArgTypeValidated(
				"Striing, Number",
				function func(a,b){
					cout("args: "+a+" "+b)
				});
		}
	});

	testList.push({
		name: "externalcall",
		desc: "Tests external call with internal-variable-change flag and constant directive with a thrower",
		exp: [
		"JEEP run time error [class Class]. The variable 'value' was attempted to be modified externally.",
		"value: 55",
		"JEEP run time error [class Class]. The function 'ConstFunc' is declared constant but tried to modify the variable 'value'.",
		],
		func: function(cout){
			let Class = env.Object.CreateClass("Class", {
				Flags: "internal-variable-change",
				Variables: {value: 0},
				CONSTRUCTOR: function(){},
				Functions: {
					Test: function(ec, fc, thrower){
						try{this.ExternalCall(ec, 100)}catch(e){}
						fc(55)
						try{this.ExternalCall(thrower, 100)}catch(e){}
						cout("value: "+this.value)
					},
					// use a constant function to check that the flags are kept consistent by ExternalCall
					$const$__ConstFunc: function(){this.value = 100}
				}
			});
			let c = new Class;
			let f = function(v){c.value = v}
			c.Test(f, f, function(){throw "??"})
			try{c.ConstFunc()}catch(e){}
		}
	});

	testList.push({
		name: "ctor-fail-ex",
		desc: "A class constructor fails by throwing an exception",
		exp: ["The class 'Class' failed to instantiate due to the exception <failure by exception>."],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){throw "failure by exception";},
			});
			try{TestEnvInfo.simpleTester("Class")}catch(e){cout(e.message)}
		}
	});

	if(env.IsDevMode())
	{
		testList.push({
			name: "init-crbaseclass",
			desc: "Giving non jeep class in CrBaseClass",
			exp: ["JEEP error in RegisterClass for class [Class]. Only JEEP generated classes can be used in CrBaseClass."],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CrBaseClass: [{}],
					CONSTRUCTOR: function(){},
				});
			}
		});

		testList.push({
			name: "init-ctor-novars",
			desc: "Setting vars to a class with no variables",
			exp: ["JEEP run time error [class Class]. The class has no variables to need init constructor."],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
				});
				try{
					let Class = JEEP.GetClass("Class");
					new Class("init", {})
				}catch(e){}
			}
		});

		testList.push({
			name: "init-ctor-wrong",
			desc: "Setting wrong vars to a class ",
			exp: ["JEEP run time error [class Class]. These vars given to init constructor are invalid [age]."],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					Variables: {name: ""}
				});
				try{
					let Class = JEEP.GetClass("Class");
					new Class("init", {age: 10})
				}catch(e){}
			}
		});

		testList.push({
			name: "ctor-vcall",
			desc: "Calling virtual function from constructor with trap flag on",
			exp: [
				"JEEP run time error [class Class]. The virtual function 'Test' was invoked from the constructor.",
				"The class 'Class' failed to instantiate."
			],
			func: function(cout){
				env.Object.RegisterClass("Base", {})
				env.Object.RegisterClass("Class", {
					Flags: "trap-invalid-virtual-call",
					BaseClass: "Base",
					CONSTRUCTOR: function(){this.Test()},
					Functions: {$virtual$__Test: function(){cout("if this prints the test failed")}}
				});
				try{TestEnvInfo.simpleTester("Class")}catch(e){cout(e.message)}
			}
		});

		testList.push({
			name: "dtor-vcall",
			desc: "Calling virtual function from destructor with trap flag on",
			exp: [
				"JEEP run time error [class Class]. The virtual function 'Test' was invoked from the destructor.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					Flags: "trap-invalid-virtual-call",
					DESTRUCTOR: function(){this.Test()},
					Functions: {$virtual$__Test: function(){cout("if this prints the test failed")}}
				});
				try{
					env.Function.ScopedCall(function(){
						JEEP.GetClass("Class").ScopedCreate();
					})
				}catch(e){}
			}
		});
	}
	testList.push({
		name: "setter-arg",
		desc: "The setter is given wrong number of arguments",
		exp: [
			"JEEP run time error [class Class]. The function 'SetValue' is declared to take 1 arguments but invoked with 0.",
			"JEEP run time error [class Class]. The function 'SetValue' is declared to take 1 arguments but invoked with 2.",
			],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Variables: {$set$__value: 0},
				Functions: {
					Test2: function(){this.SetValue(10, 20)},
					Test0: function(){this.SetValue()}
				}
			});
			TestEnvInfo.simpleTester("Class", ["Test0", "Test2"], true);
		}
	});

	testList.push({
		name: "inst-abs-reg",
		desc: "Attempt to instantiate a class with unimplimented abstract function (register method)",
		exp: [	
			"JEEP run time error [class Class]. Instantiation failed due to unimplemented abstract functions.",
			"The abstract function 'SomeFunction' is not implemented.",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {$abstract$__SomeFunction: function(){}}
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
		}
	});

	testList.push({
		name: "inst-abs-decdef",
		desc: "Attempt to isntantiate a class with unimplimented abstract function (declare-define method)",
		exp: [	
			"JEEP run time error [class Class]. Instantiation failed due to unimplemented abstract functions.",
			"The abstract function 'SomeFunction' is not implemented.",
		],
		func: function(cout){
			env.Object.DeclareClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {$abstract$__SomeFunction: function(){}}
			});				
			env.Object.DefineClass("Class", {
				CONSTRUCTOR: function(){},
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
		}
	});	
}

TestEnvInfo.passtest_Robustness = function(env, testList)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "immutable function",
		desc: "Tests immutable functions (with object containing functions and array with MakeArgConst).",
		exp: [
		"before call: 100", "before mod: 100", "after mod: 3", "after call: 100",
		],
		func: function(cout){
			let obj = {
				a: 100,
				SetA: function(a){this.a = a},
				GetA: function(){return this.a}
			}
			cout("before call: " + obj.a);
			let f = env.Function.MakeArgConst(function func(obj){
				cout("before mod: " + obj.GetA());
				obj.SetA(3);
				cout("after mod: " + obj.a);
			});
			f(obj);
			cout("after call: " + obj.a);
		}
	});
	
	if(env.IsDevMode())
	{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "immutable member function",
		desc: "Tests immutable mechanism for member functions (with object containing functions and array).",
		exp: [
		"before call: 100", "before mod: 100",
		"after mod: 3", "after call: 100",
		],
		func: function(cout){
			let obj = {
				a: 100,
				SetA: function(a){this.a = a},
				GetA: function(){return this.a}
			}
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("Print: " + this.GetName())},
					$argconst$___Test: function(obj){
						cout("before mod: " + obj.GetA());
						obj.SetA(3);
						cout("after mod: " + obj.a);						
					}
				}
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
			cout("before call: " + obj.a);
			a.Test(obj);
			cout("after call: " + obj.a);
		}
	});
	}
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "rob-f-argtypes",
		desc: "Tests arg type (count, arr, num, rec, struct, class)",
		exp: [
		"JEEP run time error [class Class]. The function 'Print' expects 5 number of argument(s).",
		"JEEP run time error [class Class]. The function 'Print' expects 'number' type for argument 0.",
		"JEEP run time error [class Class]. The function 'Print' expects 'array' type for argument 1.",
		"JEEP run time error [class Class]. The function 'Print' expects 'record Record' type for argument 2 but it is not registered.",
		"JEEP run time error [class Class]. The function 'Print' expects 'struct Struct' type for argument 3 but it is not registered.",
		"JEEP run time error [class Class]. The function 'Print' expects 'class Class' type for argument 4 but it is not registered.",
		],
		func: function(cout){
			let C = env.Object.CreateClass("Class", {
				Functions: {
					$Print: "Number, Array, record.Record, struct.Struct, class.Class",
					Print: function(num, arr, rec, str, cls){}
				}
			})
			let c = new C;
			try{c.Print()}catch(e){}
			try{c.Print("a")}catch(e){}
			try{c.Print(1,2)}catch(e){}
			try{c.Print(1,[2],3)}catch(e){}
			env.Object.RegisterRecord("Record", {dummy: 0})
			let Record = JEEP.GetRecord("Record");
			try{c.Print(1,[2],Record.New(), 4)}catch(e){}
			env.Object.RegisterStruct("Struct", {Variables: {dummy: 0}})
			let Struct = JEEP.GetStruct("Struct");
			try{c.Print(1,[2],Record.New(), Struct.New(), 5)}catch(e){}
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "constant function",
		desc: "Tests constant member function mechanism.",
		exp: [
		"value: 10",  
		"value: 10", 
		"JEEP run time error [class Class]. The function 'Test' is declared constant but tried to modify the variable 'value'.",
		"value: 10", 
		"JEEP run time error [class Class]. The function 'Test' is declared constant but tried to modify the variable 'value'.",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					$const$__Test: function(){this.Print();this.SetValue(0);},
					Print: function(){cout("value: " + this.value);}
				},
				Variables: {$set$__value: 10},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			c.Print();
			try{c.Test();}catch(e){}
			c.Test();// verify that readonly is reset
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "internal variable change",
		desc: "Tests the eponymous flag.",
		exp: [
		"value: 10",  
		"c.value: -99", 
		"JEEP run time error [class Class]. The variable 'value' was attempted to be modified externally.",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("value: " + this.value);}
				},
				Variables: {$set$__value: 10},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			c.Print();
			c.SetValue(-99);
			cout("c.value: " + c.value);
			c.value = 8;
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "internal variable change with constant function",
		desc: "Tests the case where some functions are constant as well as class has declared internal variable change.",
		exp: [
		"value: 10",  
		"c.value: -99", 
		"value: -99", 
		"JEEP run time error [class Class]. The function 'Test' is declared constant but tried to modify the variable 'value'.",
		"JEEP run time error [class Class]. The variable 'value' was attempted to be modified externally.",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				Functions: {
					$const$__Test: function(){this.Print();this.SetValue(0);},
					Print: function(){cout("value: " + this.value);}
				},
				Variables: {$set$__value: 10},
			});	
			let Class =	JEEP.GetClass("Class");
			let x = new Class;
			let c = x;// using c instead of x must not deviate from the expectation
			c.Print();
			c.SetValue(-99);
			cout("c.value: " + c.value);
			try{c.Test();}catch(e){}
			c.value = 8;
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "internal variable change with constant function with inheritance",
		desc: "Tests the case where some functions are constant as well as class has declared internal variable change.",
		exp: [
		"value: 10",  
		"JEEP run time error [class Derived]. The function 'Test' is declared constant but tried to modify the variable 'value'.",
		"c.value: 10", 
		"JEEP run time error [class Derived]. The variable 'value' was attempted to be modified externally.",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				Functions: {
					$const$__Test: function(){this.doTest();},
					Print: function(){cout("value: " + this.value);}
				},
				Variables: {$set$__value: 10},
			});	
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {$virtual$__doTest(){this.Print();this.SetValue(-99)}},
			});
			let Derived = JEEP.GetClass("Derived");
			let c = new Derived;
			try{c.Test();}catch(e){}
			cout("c.value: " + c.value);
			c.value = 8;
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "constant function in base not derived",
		desc: ".",
		exp: [
		"value: 10",  
		"JEEP run time error [class Derived]. The function 'Test' is declared constant but tried to modify the variable 'value'.",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("value: " + this.value);},
					$const$__Test(){this.Print();this.SetValue(-99)}
				},
				Variables: {$set$__value: 10},
			});	
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
			});
			let Derived = JEEP.GetClass("Derived");
			let c = new Derived;
			try{c.Test();}catch(e){}
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "constant function in derived not base",
		desc: ".",
		exp: [
		"value: 10",  
		"JEEP run time error [class Derived]. The function 'Test' is declared constant but tried to modify the variable 'value'.",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("value: " + this.value);}
				},
				Variables: {$set$__value: 10},
			});	
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {$const$__Test(){this.Print();this.SetValue(-99)}},
			});
			let Derived = JEEP.GetClass("Derived");
			let c = new Derived;
			try{c.Test();}catch(e){}
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "internal variable change flag in derived not base",
		desc: ".",
		exp: [
		"value: 10",  "value: 0",
		"JEEP run time error [class Derived]. The variable 'value' was attempted to be modified externally.",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("value: " + this.value);}
				},
				Variables: {$set$__value: 10},
			});	
			env.Object.RegisterClass("Derived", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {Test(f){this.Print();this.SetValue(-99);f()}},
			});
			let Derived = JEEP.GetClass("Derived");
			let c = new Derived;
			c.Test(function(){c.value=0});// this is effectively a friend function
			c.Print();
			c.value = 0;
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "constant function and internal variable change with nested variables",
		desc: ".",
		exp: [
		"obj value: 10", "deep obj value: 10", 
		"JEEP run time error [class Class]. The function 'Test' is declared constant but tried to modify the variable 'obj'.",
		"JEEP run time error [class Class]. The function 'Test' is declared constant but tried to modify the variable 'deepObj'.",
		"obj value: 10", "deep obj value: 10", 
		"obj value: 10", "deep obj value: 10", 
		"obj value: 10", "deep obj value: 10", 
		"obj value: 33", "deep obj value: 33", 
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				Functions: {
					$const$__Test(){
						this.Print();
						try{this.obj = {value:-321};}catch(e){}
						try{this.deepObj = {value:-321};}catch(e){}
						let k = this.obj;
						k.value = -99;
						k = this.deepObj;
						k.obj.value = -99;
						this.Print();
					},
					Print: function(){
						cout("obj value: " + this.obj.value);
						cout("deep obj value: " + this.deepObj.obj.value);
					},
					Modify: function(){
						// modify directly to ensure non cloned is returned
						this.obj.value = 33;
						this.deepObj.obj.value = 33;
					}
				},
				Variables: {
					obj:{value: 10},
					deepObj: {obj:{value: 10}}
				},
			});	
			let Class = JEEP.GetClass("Class");
			let c = new Class;			
			c.Test();
			c.obj.value = -99;
			c.deepObj.obj.value = -99;
			c.Print();
			let k = c.obj;
			k.value = -99;
			k = c.deepObj;
			k.obj.value = -99;
			c.Print();
			c.Modify();
			c.Print();
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "argument count",
		desc: "Tests that argument count is enforced.",
		exp: [
		"JEEP run time error [class Class]. The function 'Print' is declared to take 2 arguments but invoked with 0.",
		"JEEP run time error [class Class]. The function 'Print' is declared to take 2 arguments but invoked with 3.",
		"puss in boots",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				Functions: {
					$argnum$__Print: function(what, where){cout(what + " in " + where);}
				},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			try{c.Print()}catch(e){}
			try{c.Print(1,2,3)}catch(e){}

			let func = env.Function.MakeArgNumValidated(function func(what, where){
				cout(what + " in " + where);
			})
			func("puss", "boots")
			//try{func()}catch(e){}
			//try{func(1,2,3)}catch(e){}
		}
	});		
}

TestEnvInfo.failtest_Robustness = function(env, testList)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "rob-fail-const",
		desc: "Tests the constness in development and production mode (with retain).",
		exp: [
		"JEEP run time error [class Class]. The function 'Read' is declared constant but tried to modify the variable 'value'.",
		],
		func: function(cout){
			let Class = env.Object.CreateClass("Class", {
				Functions: {
					$const$__Read: function(){this.value = 10;},
				},
				Variables: {value: 0},
			});
			let c = new Class;
			try{c.Read()}catch(e){}
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "rob-fail-internal-change",
		desc: "Tests the internal-variable-change flag in development and production mode (with retain).",
		exp: [
		"JEEP run time error [class Class]. The variable 'value' was attempted to be modified externally.",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				Variables: {$set$__value: 10},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			c.SetValue(-99);
			c.value = 8;
		}
	});		
	if(env.IsDevMode())
	{
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "static functions argnum",
			desc: "",
			exp: [
				"Class.DESTRUCTOR", "obj.value: 5",
				"JEEP run time error [class Class]. The function 'Test' is declared to take 1 arguments but invoked with 0."
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					DESTRUCTOR: function(){cout("Class.DESTRUCTOR")},
					Static: {
						$scoped_argconst_argnum$__Test: function(obj){
							obj.value = -99;
							this.ScopedCreate();
						}
					},
				});	
				let Class =	JEEP.GetClass("Class");
				let obj = {value: 5};
				Class.Test(obj);
				cout("obj.value: "+obj.value);
				try{Class.Test()}catch(e){}
			}
		});		
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "argtype-static",
			desc: "Tests arg type in static (count, arr, num, rec, struct, class)",
			exp: [
			"JEEP run time error [class Class]. The function 'Print' expects 5 number of argument(s).",
			"JEEP run time error [class Class]. The function 'Print' expects 'number' type for argument 0.",
			"JEEP run time error [class Class]. The function 'Print' expects 'array' type for argument 1.",
			"JEEP run time error [class Class]. The function 'Print' expects 'record Record' type for argument 2 but it is not registered.",
			"JEEP run time error [class Class]. The function 'Print' expects 'struct Struct' type for argument 3 but it is not registered.",
			"JEEP run time error [class Class]. The function 'Print' expects 'class Class' type for argument 4 but it is not registered.",
			],
			func: function(cout){
				let C = env.Object.CreateClass("Class", {
					Static: {
						$Print: "Number, Array, record.Record, struct.Struct, class.Class",
						Print: function(num, arr, rec, str, cls){}
					}
				})
				try{C.Print()}catch(e){}
				try{C.Print("a")}catch(e){}
				try{C.Print(1,2)}catch(e){}
				try{C.Print(1,[2],3)}catch(e){}
				env.Object.RegisterRecord("Record", {dummy: 0})
				let Record = JEEP.GetRecord("Record");
				try{C.Print(1,[2],Record.New(), 4)}catch(e){}
				env.Object.RegisterStruct("Struct", {Variables: {dummy: 0}})
				let Struct = JEEP.GetStruct("Struct");
				try{C.Print(1,[2],Record.New(), Struct.New(), 5)}catch(e){}
			}
		});
	}
}

TestEnvInfo.passtest_SingleInheritance = function(env, testList)
{
}

TestEnvInfo.failtest_SingleInheritance = function(env, testList)
{
}

TestEnvInfo.passtest_MultipleInheritance = function(env, testList)
{
	testList.push({
		name: "multiple inheritance (single level non virtual functions)",
		desc: "Tests the basic multiple inheritance setup, that derived inherits from all bases.",
		exp: [
			"BaseA.PrintA 7", "BaseB.PrintB 23", "Derived.Print 10",
			"BaseA.PrintA 7", "BaseB.PrintB 23",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){},
				Functions: {
					PrintA: function(){cout("BaseA.PrintA " + this.baval);},
				},
				Variables: {baval: 7}
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				Functions: {
					PrintB: function(){cout("BaseB.PrintB " + this.bbval);},
				},
				Variables: {bbval: 23}
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {
					Print: function(){
						this.PrintA();
						this.PrintB();
						cout(this.$name+".Print " + this.val);
					}
				},
				Variables: {val: 10}
			});
			;
			let Derived = JEEP.GetClass("Derived"); let c = new Derived;
			c.Print();
			c.PrintA();
			c.PrintB();
		}
	});

	testList.push({
		name: "multiple inheritance (single level virtual functions)",
		desc: "Tests the virtual function setup for single level multiple inheritance.",
		exp: [
			"BaseA.PrintA", "Derived 10", "BaseA 7", 
			"BaseB.PrintB", "Derived 10", "BaseB 23", 
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){},
				Functions: {
					PrintA: function(){cout("BaseA.PrintA"); this.doPrintA(cout);},
					$virtual$__doPrintA: function(logFunc){logFunc("BaseA "+this.baval)}
				},
				Variables: {baval: 7}
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				Functions: {
					PrintB: function(){cout("BaseB.PrintB"); this.doPrintB(cout);},
					$virtual$__doPrintB: function(logFunc){logFunc("BaseB "+this.bbval)}
				},
				Variables: {bbval: 23}
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {
					$virtual$__doPrintA: function(logFunc){
						logFunc(this.$name+" "+this.val);
						this.$base.BaseA.doPrintA(logFunc);
					},
					$virtual$__doPrintB: function(logFunc){
						logFunc(this.$name+" "+this.val);
						this.$base.BaseB.doPrintB(logFunc);
					},
				},
				Variables: {val: 10}
			});
			;
			let Derived = JEEP.GetClass("Derived"); let c = new Derived;
			c.PrintA();
			c.PrintB();
		}
	});

	testList.push({
		name: "multiple inheritance (multiple level non virtual functions)",
		desc: "Tests that the derived inherits from all bases at all levels.",
		exp: [
			"BaseX.PrintX 88", "BaseA.PrintA 7", "BaseB.PrintB 23", "Derived.Print 10",
			"BaseX.PrintX 88", "BaseA.PrintA 7", "BaseB.PrintB 23",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(){},
				Functions: {
					PrintX: function(){cout("BaseX.PrintX " + this.bxval);},
				},
				Variables: {bxval: 88}
			});
			;
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
				Functions: {
					PrintA: function(){cout("BaseA.PrintA " + this.baval);},
				},
				Variables: {baval: 7}
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				Functions: {
					PrintB: function(){cout("BaseB.PrintB " + this.bbval);},
				},
				Variables: {bbval: 23}
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				//CONSTRUCTOR: function(){this.$base.BaseA.CONSTRUCTOR();this.$base.BaseB.CONSTRUCTOR();},
				BaseClass: "BaseA, BaseB",
				Functions: {
					Print: function(){
						this.PrintX();
						this.PrintA();
						this.PrintB();
						cout(this.$name+".Print " + this.val);
					}
				},
				Variables: {val: 10}
			});
			;
			let Derived = JEEP.GetClass("Derived"); let c = new Derived;
			c.Print();
			c.PrintX();
			c.PrintA();
			c.PrintB();
		}
	});

	testList.push({
		name: "multiple inheritance diamond constructor order and count (all variations)",
		desc: "Tests that the constructors of bases are in order as in base[] and that common base of a diamond inheritance is called only once.",
		exp: [
			"BaseX constructor", "BaseA constructor", "BaseB constructor","Derived constructor",
			"BaseX constructor", "BaseB constructor", "BaseA constructor","Derived constructor",
			"BaseX constructor", "BaseB constructor", "BaseC constructor", "BaseA constructor","Derived constructor",
			"BaseC constructor", "BaseX constructor", "BaseB constructor", "BaseA constructor","Derived constructor",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(){cout("BaseX constructor")},
			});
			;
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){cout("BaseA constructor")},
				BaseClass: "BaseX",
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){cout("BaseB constructor")},
				BaseClass: "BaseX",
			});
			;
			// use left to right
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){cout("Derived constructor")},
				BaseClass: "BaseA, BaseB",
			});
			let Derived = JEEP.GetClass("Derived");
			new Derived;// baseX must be called only once
			// use right to left order
			env.Object.RegisterClass("Derived2", {
				CONSTRUCTOR: function(){cout("Derived constructor")},
				BaseClass: "BaseB, BaseA",
			});
			Derived = JEEP.GetClass("Derived2");
			new Derived;
			// insert another unrelated base
			env.Object.RegisterClass("BaseC", {
				CONSTRUCTOR: function(){cout("BaseC constructor")},
			});
			;
			// insert BaseC between BaseB and BaseA
			Derived = env.Object.RegisterClass("Derived3", {
				CONSTRUCTOR: function(){cout("Derived constructor")},
				BaseClass: "BaseB, BaseC, BaseA",
			});
			Derived = JEEP.GetClass("Derived3");
			new Derived;
			// add BaseC at first
			env.Object.RegisterClass("Derived4", {
				CONSTRUCTOR: function(){cout("Derived constructor")},
				BaseClass: "BaseC, BaseB, BaseA",
			});
			Derived = JEEP.GetClass("Derived4");
			new Derived;
		}
	});

	testList.push({
		name: "multiple inheritance (diamond non virtual functions)",
		desc: "Tests that a diamond inheritance poses no problem with inheritance",
		exp: [
			"BaseX.PrintX 88", "BaseA.PrintA 7", "BaseB.PrintB 23", "Derived.Print 10",
			"BaseX.PrintX 88", "BaseA.PrintA 7", "BaseB.PrintB 23",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(){},
				Functions: {
					PrintX: function(){cout("BaseX.PrintX " + this.bxval);},
				},
				Variables: {bxval: 88}
			});
			;
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
				Functions: {
					PrintA: function(){cout("BaseA.PrintA " + this.baval);},
				},
				Variables: {baval: 7}
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
				Functions: {
					PrintB: function(){cout("BaseB.PrintB " + this.bbval);},
				},
				Variables: {bbval: 23}
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {
					Print: function(){
						this.PrintX();
						this.PrintA();
						this.PrintB();
						cout(this.$name+".Print " + this.val);
					}
				},
				Variables: {val: 10}
			});
			;
			let Derived = JEEP.GetClass("Derived"); let c = new Derived;
			c.Print();
			c.PrintX();
			c.PrintA();
			c.PrintB();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "multiple inheritance (diamond virtual functions)",
		desc: "Tests the virtual function setup in a diamond inheritance.",
		exp: ["BaseX.Print", "Derived 10", "BaseA 7", "BaseB 23",],
		func: function(cout){
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("BaseX.Print"); this.doPrint(cout);},
					$virtual$__doPrint: function(logFunc){logFunc("BaseX "+this.bxval)}
				},
				Variables: {bxval: 88}
			});
			;
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
				Functions: {
					$virtual$__doPrint: function(logFunc){logFunc("BaseA "+this.baval)}
				},
				Variables: {baval: 7}
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
				Functions: {
					$virtual$__doPrint: function(logFunc){logFunc("BaseB "+this.bbval)}
				},
				Variables: {bbval: 23}
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {
					$virtual$__doPrint: function(logFunc){
						logFunc(this.$name+" "+this.val);
						this.$base.BaseA.doPrint(logFunc);
						this.$base.BaseB.doPrint(logFunc);
					},
				},
				Variables: {val: 10}
			});
			;
			let Derived = JEEP.GetClass("Derived"); 
			let c = new Derived;
			c.Print();
		}
	});
}

TestEnvInfo.failtest_MultipleInheritance = function(env, testList)
{
}

TestEnvInfo.passtest_Wrapper = function(env, testList)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-basic",
		desc: "Tests the basic wrapping mechanism in a simple single inheritance class (renaming and fgk for functions and variables).",
		exp: [
		"Class.prototype.Change present",
		"Class.prototype.CallChange present",
		"Class.prototype.Modify absent",
		"inst.value present",
		"inst.count present",
		"inst.val absent",
		"Derived.prototype.Change absent",
		"Derived.prototype.CallChange present",
		"Derived.prototype.Modify present",
		"inst.value absent",
		"inst.count present",
		"inst.val present",
		"Class.Change", "Class.value: 100","Class.count: 33",
		"Class.Change", "Class.value: -1", "Class.count: 33",
		"Class.value: -2","Class.count: 33",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Functions: {
					Print: function(){
						cout("Class.value: "+this.value)
						cout("Class.count: "+this.count)
					},
					CallChange: function(v){this.Change(v)},
					Change: function(v){
						cout("Class.Change")
						this.value = v;
					},
				},
				Variables: {value: 0, count: 33},
			});
			let Wrapper = env.Object.CreateWrapperClass("Wrapper", {
				Class: "Class",
				Functions: {Change: "Modify"},
				Variables: {value: "val"}
			});
			let Derived = env.Object.CreateClass("Derived", {
				CrBaseClass: [Wrapper]
			})
			function testlayout(def){
				cout(def.$name+".prototype.Change " + (def.prototype.Change ? "present" : "absent"));
				cout(def.$name+".prototype.CallChange " + (def.prototype.CallChange ? "present" : "absent"));
				cout(def.$name+".prototype.Modify " + (def.prototype.Modify ? "present" : "absent"));
				let d = new def;
				cout("inst.value " + (undefined!=d.value ? "present" : "absent"));
				cout("inst.count " + (undefined!=d.count ? "present" : "absent"));
				cout("inst.val " + (undefined!=d.val ? "present" : "absent"));
				return d;
			}
			let Class = JEEP.GetClass("Class")
			testlayout(Class);// test that wrapped is not modified
			let c = testlayout(Derived);
			c.CallChange(100);// test old function (and variable) name linking
			c.Print();
			c.Modify(-1);/// test new function (and variable) name linking
			c.Print();
			c.val = -2;// test new variable name linking
			c.Print();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-double",
		desc: "Tests that more than one wrapper can exist in a hierarchy.",
		exp: [
		"TopBase.Change", "TopBase.value: 100", "TopBase.count: 33",
		"TopBase.Change", "TopBase.value: 200", "TopBase.count: 33",
		"TopBase.value: -1", "TopBase.count: 33",
		"MidBase.Change", "MidBase.value: 300", "MidBase.count: 33",
		"MidBase.Change", "MidBase.value: 400", "MidBase.count: 33",
		"MidBase.value: -2", "MidBase.count: 33",
		],
		func: function(cout){
			let commonDesc = {
				Functions: {
					Print: function(){
						cout(this.$name+".value: "+this.value)
						cout(this.$name+".count: "+this.count)
					},
					Change: function(v){
						cout(this.$name+".Change")
						this.value = v;
					},
					CallChange: function(v){this.Change(v)},
				},
				Variables: {value: 0, count: 33},
			}

			env.Object.RegisterClass("TopBase", JEEP.Utils.ShallowClone(commonDesc));
			let TopBaseWrapper = env.Object.CreateWrapperClass("TopBaseWrapper", {
				Class: "TopBase",
				Functions: {Change: "ModifyTop", CallChange: "CallModifyTop", Print: "PrintTop"},
				Variables: {value: "topval", count: "topcount"}
			});

			let mdesc = JEEP.Utils.ShallowClone(commonDesc);
			mdesc.CrBaseClass = [TopBaseWrapper]
			env.Object.RegisterClass("MidBase", mdesc);
			let MidBaseWrapper = env.Object.CreateWrapperClass("MidBaseWrapper", {
				Class: "MidBase",
				Functions: {Change: "ModifyMid"},
				Variables: {value: "midval"}
			});

			let Class = env.Object.CreateClass("Derived", {
				CrBaseClass: [MidBaseWrapper]
			})
			let c = new Class;
			// test top
			c.CallModifyTop(100);
			c.PrintTop();
			c.ModifyTop(200);
			c.PrintTop();
			c.topval = -1;
			c.PrintTop();
			// test mid
			c.CallChange(300);
			c.Print();
			c.ModifyMid(400);
			c.Print();
			c.midval = -2;
			c.Print();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-getset-var",
		desc: "Tests the basic wrapping mechanism with variables with getter and setter directives.",
		exp: [
		"Class.Change", "Class.value: 100",
		"Class.value: -1", 
		"Class.value: -2",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Functions: {
					Print: function(){cout("Class.value: "+this.value)},
					CallChange: function(v){this.Change(v)},
					Change: function(v){
						cout("Class.Change")
						this.SetValue(v);
					},
				},
				Variables: {$get_set$__value: 0},
			});
			let Wrapper = env.Object.CreateWrapperClass("Wrapper", {
				Class: "Class",
				Functions: {Change: "Modify"},
				Variables: {value: "val"}
			});
			let Class = env.Object.CreateClass("Derived", {
				CrBaseClass: [Wrapper]
			})
			let c = new Class;
			c.CallChange(100);
			c.Print();
			c.val = -1;
			c.Print();
			c.SetValue(-2);
			c.Print();
		}
	});

	if(env.IsDevMode())
	{
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "wrap-const",
			desc: "Tests the wrapping mechanism in a simple single inheritance class with constant function.",
			exp: [
			"JEEP run time error [class Derived]. The function 'Read' is declared constant but tried to modify the variable 'value'.",
			"JEEP run time error [class Derived]. The function 'Read' is declared constant but tried to modify the variable 'value'.",
			"Class.value: -2",
			"Derived.Read",
			"JEEP run time error [class Derived]. The function 'Read' is declared constant but tried to modify the variable 'value'.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					Functions: {
						Print: function(){cout("Class.value: "+this.value)},
						CallRead: function(){this.Read()},
						$const$__Read: function(){this.value = 10;},
					},
					Variables: {value: 0},
				});
				let Wrapper = env.Object.CreateWrapperClass("Wrapper", {
					Class: "Class",
					Functions: {Read: "NewRead"},
					Variables: {value: "val"}
				});
				let Class = env.Object.CreateClass("Derived", {
					CrBaseClass: [Wrapper],
					Functions: {
						$const$__Read: function(){
							cout("Derived.Read")
							this.val = 10;
						},
					}
				})
				let c = new Class;
				try{c.CallRead()}catch(e){}
				try{c.NewRead()}catch(e){}
				c.val = -2;
				c.Print();
				try{c.Read()}catch(e){}
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "wrap-internal-change",
			desc: "Tests the wrapping mechanism in a simple single inheritance class with internal-variable-change.",
			exp: [
			"Class.value: 100",
			"JEEP run time error [class Derived]. The variable 'val' was attempted to be modified externally.",
			"Class.value: 100",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					Flags: "internal-variable-change",
					Functions: {
						Print: function(){cout("Class.value: "+this.value)},
						CallChange: function(v){this.Change(v)},
						Change: function(v){this.value = v;},
					},
					Variables: {value: 0},
				});
				let Wrapper = env.Object.CreateWrapperClass("Wrapper", {
					Class: "Class",
					Functions: {Change: "Modify"},
					Variables: {value: "val"}
				});
				let Class = env.Object.CreateClass("Derived", {
					CrBaseClass: [Wrapper]
				})
				let c = new Class;
				c.CallChange(100);
				c.Print();
				try{c.val = -1}catch(e){}// error reports new name
				c.Print();
			}
		});
	}

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-virt",
		desc: "Tests wrapping a class with virtual functions and replacing one of them",
		exp: [
		"Base.prototype.printName present",
		"Base.prototype.getChangeValue present",
		"Base.prototype.GCV absent",
		"WrapperDerived.prototype.printName present",
		"WrapperDerived.prototype.getChangeValue absent",
		"WrapperDerived.prototype.GCV present",
		"Base", 
		"Base value changing to: -1",
		"Derived", 
		"Base value changing to: 2",
		"WrapperDerived", 
		"Base value changing to: 100"
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Functions: {
					CallChange: function(){
						this.printName();
						let v = this.getChangeValue();
						cout("Base value changing to: "+v)
					},
					$virtual$__printName: function(){cout("Base")},
					$virtual$__getChangeValue: function(){return -1},
				},
			});
			let BaseWrapper = env.Object.CreateWrapperClass("BaseWrapper", {
				Class: "Base",
				Functions: {getChangeValue: "GCV"}
			});
			let WrapperDerived = env.Object.CreateClass("WrapperDerived", {
				CrBaseClass: [BaseWrapper],
				Functions: {
					Test: function(){
						this.CallChange()
					},
					$virtual$__printName: function(){cout("WrapperDerived")},
					$virtual$__GCV: function(){return 100},
				},
			});
			let Derived = env.Object.CreateClass("Derived", {
				BaseClass: "Base",
				Functions: {
					Test: function(){
						this.CallChange()
					},
					$virtual$__printName: function(){cout("Derived")},
					$virtual$__getChangeValue: function(){return -2 * this.$base.Base.getChangeValue()},
				},
			});
			function testlayout(def){
				cout(def.$name+".prototype.printName " + (def.prototype.printName ? "present" : "absent"));
				cout(def.$name+".prototype.getChangeValue " + (def.prototype.getChangeValue ? "present" : "absent"));
				cout(def.$name+".prototype.GCV " + (def.prototype.GCV ? "present" : "absent"));
			}
			// test that wrapping won't affect the definition of the wrapped class 
			let Base = JEEP.GetClass("Base")
			testlayout(Base);
			testlayout(WrapperDerived)
			let b = new Base;
			b.CallChange();
			d = new Derived;
			d.Test();
			// test the wrapping mechanism
			d = new WrapperDerived;
			d.Test();
		}
	});
	
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-abs",
		desc: "Tests wrapping a class with abstract functions and replacing one of them",
		exp: [
		"JEEP run time error [class Base]. Instantiation failed due to unimplemented abstract functions.",
		"The abstract function 'getChangeValue' is not implemented.",
		"Base value changing to: 0",
		"Base value changing to: 100"
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Functions: {
					CallChange: function(){
						let v = this.getChangeValue();
						cout("Base value changing to: "+v)
					},
					$abstract$__getChangeValue: function(){},
				},
			});
			let BaseWrapper = env.Object.CreateWrapperClass("BaseWrapper", {
				Class: "Base",
				Functions: {getChangeValue: "GCV"}
			});
			let WrapperDerived = env.Object.CreateClass("WrapperDerived", {
				CrBaseClass: [BaseWrapper],
				Functions: {
					Test: function(){
						this.CallChange()
					},
					$virtual$__GCV: function(){return 100},
				},
			});
			let Derived = env.Object.CreateClass("Derived", {
				BaseClass: "Base",
				Functions: {
					Test: function(){
						this.CallChange()
					},
					$virtual$__getChangeValue: function(){return 0},
				},
			});
			// test that wrapping won't affect the definition of the wrapped class 
			let Base = JEEP.GetClass("Base")
			try{new Base}catch(e){}
			let d = new Derived;
			d.Test();
			// test the wrapping mechanism
			d = new WrapperDerived;
			d.Test();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-multiple",
		desc: "Tests wrapping a class in multiple inheritance",
		exp: [
		"BaseA.Change", "BaseA.value: 100", "BaseB.value: 0",
		"BaseX.value: 33",
		"BaseA.Change", "BaseA.value: 200", "BaseB.value: 0",
		"BaseA.value: -1", "BaseB.value: 0",
		"BaseB.Change","BaseB.value: 300", "BaseA.value: -1", 
		"BaseX.value: 33",
		"BaseB.Change","BaseB.value: 400", "BaseA.value: -1", 
		"BaseB.value: -2","BaseA.value: -1", 
		],
		func: function(cout){
			let commonDesc = {
				Functions: {
					Print: function(){
						cout(this.$name+".value: "+this.value)
					},
					Change: function(v){
						cout(this.$name+".Change")
						this.value = v;
						this.Print();
					},
					CallChange: function(v){
						this.Change(v);
					},
				},
				Variables: {value: 0},
			}

			env.Object.RegisterClass("BaseA", JEEP.Utils.ShallowClone(commonDesc));
			let BaseAW = env.Object.CreateWrapperClass("BaseAWrapper", {
				Class: "BaseA",
				Functions: {Print: "PrintA", Change: "ChangeA", CallChange: "CallChangeA"},
				Variables: {value: "avalue"}
			});

			env.Object.RegisterClass("BaseB", JEEP.Utils.ShallowClone(commonDesc));
			let BaseBW = env.Object.CreateWrapperClass("BaseBWrapper", {
				Class: "BaseB",
				Functions: {Print: "PrintB", Change: "ChangeB", CallChange: "CallChangeB"},
				Variables: {value: "bvalue"}
			});

			env.Object.RegisterClass("BaseX", {
				Variables: {value: 33},
				Functions: {
					ReadValue: function(){return this.value},
					Print: function(){cout("BaseX.value: "+this.value)}
				}
			})
			
			let Derived = env.Object.CreateClass("Derived", {
				BaseClass: "BaseX",
				CrBaseClass: [BaseAW, BaseBW],
			});
			d = new Derived;
			// test BaseA
			d.CallChangeA(100)
			d.PrintB();
			d.Print();
			d.ChangeA(200)
			d.PrintB();
			d.avalue = -1;
			d.PrintA();
			d.PrintB();
			// test BaseB
			d.CallChangeB(300)
			d.PrintA();
			d.Print();
			d.ChangeB(400)
			d.PrintA();
			d.bvalue = -2;
			d.PrintB();
			d.PrintA();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-multiple-restracc",
		desc: "Tests wrapping a class in multiple inheritance with restricted access",
		exp: [
		"BaseA.Change", "BaseA.value: 100", "BaseB.value: 0",
		"BaseX.Print",
		"BaseA.Change", "BaseA.value: 200", "BaseB.value: 0",
		"BaseA.value: -1", "BaseB.value: 0",
		"BaseB.Change","BaseB.value: 300", "BaseA.value: -1", 
		"BaseB.Change","BaseB.value: 400", "BaseA.value: -1", 
		"BaseB.value: -2","BaseA.value: -1", 
		],
		func: function(cout){
			let commonDesc = {
				Functions: {
					Print: function(){
						cout(this.$name+".value: "+this.value)
					},
					Change: function(v){
						cout(this.$name+".Change")
						this.value = v;
						this.Print();
					},
					CallChange: function(v){
						this.Change(v);
					},
				},
				Variables: {value: 0},
			}

			env.Object.RegisterClass("BaseA", JEEP.Utils.ShallowClone(commonDesc));
			let BaseAW = env.Object.CreateWrapperClass("BaseAWrapper", {
				Class: "BaseA",
				Functions: {Print: "PrintA", Change: "ChangeA", CallChange: "CallChangeA"},
				Variables: {value: "avalue"}
			});

			env.Object.RegisterClass("BaseB", JEEP.Utils.ShallowClone(commonDesc));
			let BaseBW = env.Object.CreateWrapperClass("BaseBWrapper", {
				Class: "BaseB",
				Functions: {Print: "PrintB", Change: "ChangeB", CallChange: "CallChangeB"},
				Variables: {value: "bvalue"}
			});

			env.Object.RegisterClass("BaseX", {
				Variables: {value: 33},
				Functions: {
					$const$__ReadValue: function(){return this.value},
					Print: function(){cout("BaseX.Print")}
				}
			})
			
			let Derived = env.Object.CreateClass("Derived", {
				BaseClass: "BaseX",
				CrBaseClass: [BaseAW, BaseBW],
			});
			d = new Derived;
			// test BaseA
			d.CallChangeA(100)
			d.PrintB();
			d.Print();
			d.ChangeA(200)
			d.PrintB();
			d.avalue = -1;
			d.PrintA();
			d.PrintB();
			// test BaseB
			d.CallChangeB(300)
			d.PrintA();
			d.ChangeB(400)
			d.PrintA();
			d.bvalue = -2;
			d.PrintB();
			d.PrintA();
		}
	});

}

TestEnvInfo.failtest_Wrapper = function(env, testList)
{
	if(env.IsDevMode())
	{
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "wrap-novars",
			desc: "Tests wrapping non existing variables.",
			exp: [
			"JEEP aborting from CreateWrapperClass. The specification given is invalid.",
			"The function 'Change' does not exist in the class [Class].",
			"The variable 'value' does not exist in the class [Class].",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					Functions: {
						Print: function(){},
					},
					Variables: {count: 0},
				});
				let Wrapper = env.Object.CreateWrapperClass("Wrapper", {
					Class: "Class",
					Functions: {Change: "Modify"},
					Variables: {value: "val"}
				});
				let Class = env.Object.CreateClass("Derived", {
					CrBaseClass: [Wrapper]
				})
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "wrap-abs",
			desc: "Tests wrapping abstract function and instantiating with it unimplemented.",
			exp: [
			"JEEP run time error [class Derived]. Instantiation failed due to unimplemented abstract functions.",
			"The abstract function 'ProvideName' declared in base [Wrapper] is not implemented.",
			],
			func: function(cout){
				env.Object.RegisterClass("Base", {
					Functions: {
						Print: function(){},
						$abstract$__GetName: function(){},
					},
				});
				let Wrapper = env.Object.CreateWrapperClass("Wrapper", {
					Class: "Base",
					Functions: {GetName: "ProvideName"},
				});
				let Derived = env.Object.CreateClass("Derived", {
					CrBaseClass: [Wrapper]
				})
				new Derived;
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "wrapper clash",
			desc: "Test that unrenamed members still clash.",
			exp: [
				"JEEP couldn't generate the class [Derived] due to the following errors.",
				"The function 'CallFunction' is declared multiple times in the hierarchy [BaseB, BaseA].",
			],
			func: function(cout){
				env.Object.RegisterClass("BaseA", {
					Functions: {
						CallFunction: function(){
							cout("BaseA.CallFunction")
							this.Function()
						},
						Function: function(){
							cout("BaseA.Function")
						},
					},
				});
				env.Object.RegisterClass("BaseB", {
					Functions: {
						CallFunction: function(){
							cout("BaseA.CallFunction")
							this.Function()
						},
						Function: function(){
							cout("BaseA.Function")
						},
					},
				});
				let BaseBWrapper = env.Object.CreateWrapperClass("BaseBWrapper", {
					Class: "BaseB",
					Functions: {
						Function: "BFunction",
					},
				});
				let Derived = env.Object.CreateClass("Derived", {
					BaseClass: "BaseA",
					CrBaseClass: [BaseBWrapper],
				});
			}
		});		
	}

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrapper abstract function",
		desc: "Test that unrenamed members still clash.",
		exp: [
			"JEEP run time error [class Derived]. Instantiation failed due to unimplemented abstract functions.",
			"The abstract function 'BAbstractFunction' declared in base [BaseBWrapper] is not implemented.",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				Functions: {
					Function: function(){
						cout("BaseA.Function")
					},
					$abstract$_Abstract: function(){},
				},
			});
			env.Object.RegisterClass("BaseB", {
				Functions: {
					Function: function(){
						cout("BaseA.Function")
					},
					$abstract$_Abstract: function(){},
				},
			});
			let BaseBWrapper = env.Object.CreateWrapperClass("BaseBWrapper", {
				Class: "BaseB",
				Functions: {
					Function: "BFunction",
					Abstract: "BAbstractFunction"
				},
			});
			let Derived = env.Object.CreateClass("Derived", {
				BaseClass: "BaseA",
				CrBaseClass: [BaseBWrapper],
				Functions: {
					$virtual$_Abstract: function(){},
				}
			});
			new Derived;
		}
	});		
}

TestEnvInfo.generateProtectedTests = function(dev, prod, testList)
{
	function copy(tl){
		for(let k = 0; k<tl.length; k++)
			testList.push(tl[k])
	}
	let tlist = [];
	let devpass = 0, devfail = 0, prodpass = 0, prodfail = 0;

	tlist = [];
	TestEnvInfo.passtest_Protected(dev, tlist);
	devpass += tlist.length;
	TestEnvInfo.addPrefix(tlist, true, true);
	copy(tlist);

	tlist = [];
	TestEnvInfo.failtest_Protected(dev, tlist);
	devfail += tlist.length;
	TestEnvInfo.addPrefix(tlist, false, true);
	copy(tlist);

	tlist = [];
	TestEnvInfo.passtest_Protected(prod, tlist);
	prodpass += tlist.length;
	TestEnvInfo.addPrefix(tlist, true, false);
	copy(tlist);

	tlist = [];
	TestEnvInfo.failtest_Protected(prod, tlist);
	prodfail += tlist.length;
	TestEnvInfo.addPrefix(tlist, false, false);
	copy(tlist);

	// have all retain-x flags except retain-protected
	let prodNoRetEnv = JEEP.CreateEnvironment({
		mode: "production-mode", client: "jeep-aware",
		flags: "retain-const, retain-argtypes, retain-argnum, retain-argconst, retain-internal-varchange, retain-abstract-check, retain-init-change-check"
	});

	tlist = [];
	TestEnvInfo.passtest_Protected(prodNoRetEnv, tlist, true);
	prodpass += tlist.length;
	TestEnvInfo.addPrefix(tlist, true, false, "prod-noretain");
	copy(tlist);

	tlist = [];
	TestEnvInfo.failtest_Protected(prodNoRetEnv, tlist, true);
	prodfail += tlist.length;
	TestEnvInfo.addPrefix(tlist, false, false, "prod-noretain");
	copy(tlist);

	return {
		devPassCount: devpass,
		devFailCount: devfail,
		prodPassCount: prodpass,
		prodFailCount: prodfail,
		passCount: devpass+prodpass,
		failCount: devfail+prodfail,
	}
}

TestEnvInfo.passtest_Protected = function(env, testList, prodnoret)
{
	TestEnvInfo.commonProtectedPass(env, testList, prodnoret)
}

TestEnvInfo.failtest_Protected = function(env, testList, prodnoret)
{
	TestEnvInfo.commonProtectedFail(env, testList, prodnoret)
}

TestEnvInfo.commonProtectedPass = function(env, testList, prodnoret)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prot-basic-vars-func",
		desc: "Tests the basic setup of protected members",
		aspects: "protected",
		exp: [
			"public value: 100",
			"protected value via direct access: -33",
			"protected value via protected function: -33",
			"public value via protected function: 100",
			"protected function access protected function: -133",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(v){
					this.value = v;
				},
				Functions: {
					$usepriv$__Test: function(){
						cout("public value: "+this.GetValue());
						cout("protected value via direct access: "+this.$.pvalue);
						cout("protected value via protected function: "+this.$.GetProtValue());
						cout("public value via protected function: "+this.$.GetPublicValue());
						cout("protected function access protected function: "+this.$.PrivAccessPriv());
					},
				},
				Variables: {$get$__value: 0},
				Protected: {
					pvalue: -33,
					GetProtValue: function(){return this.$.pvalue},
					GetPublicValue: function(){return this.value;},
					PrivAccessPriv: function(){return this.$.GetProtValue() - this.$.GetPublicValue()},
				}
			});
			let A = JEEP.GetClass("Class");
			let a = new A(100);
			a.Test();
		}
	});

	if(!prodnoret)
	{
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "prot-access-error",
			desc: "Tests the basic setup of protected members",
			aspects: "protected",
			exp: [
				"JEEP aborting due to run time error. The function 'GetProtValue' of the class [Class] is protected and not accessible directly.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					Protected: {
						GetProtValue: function(){cout("GetProtValue")},
					}
				});
				let A = JEEP.GetClass("Class");
				let a = new A(100);
				try{a.GetProtValue()}catch(e){}
			}
		});
	}

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prot-plain-decl",
		desc: "Tests arg type",
		exp: [
		"Class"
		],
		func: function(cout){
			env.Object.DeclareClass("Class", {
				CONSTRUCTOR: function(){},
				Protected: {
					$Print: "Array, Number, String",
					$virtual$__Print: function(a,b,c){},
				}
			})
			env.Object.DefineClass("Class", {
				CONSTRUCTOR: function(){cout("Class")},
				Protected: {
					$Print: "Array, Number, String",
					$virtual$__Print: function(a,b,c){},
				}
			})
			let Class = JEEP.GetClass("Class")
			new Class;
		}
	});

	testList.push({
		name: "protected-basic",
		desc: "Tests protected setup.",
		exp: [
		"ctor prot value before change: -1",
		"ctor prot value after change: 100",
		"GetValue: 100", "GetName: Derived+Base",
		"GetValue: 100","GetName: Derived+Base",
		 ],
		func: function(cout){
			let Base = env.Object.CreateClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){this.$.ProtPrint()},
				},
				Protected: {
					ProtPrint: function(){
						cout("GetValue: " + this.$.GetValue())
						cout("GetName: " + this.$.GetName())
					},
					$abstract$__GetValue: function(){},
					$virtual$__GetName: function(){return "Base"}
				}
			});
			let Derived = env.Object.CreateClass("Derived", {
				CONSTRUCTOR: function(v){
					cout("ctor prot value before change: "+this.$.value)
					this.$.value = v
					cout("ctor prot value after change: "+this.$.value)
				},
				CrBaseClass: [Base],
				Functions: {
					CallProtected: function(){this.$.ProtPrint()},
				},
				Protected: {
					value: -1,
					$virtual$__GetValue: function(){return this.$.value},
					$virtual$__GetName: function(){
						return "Derived+"+this.$base.Base.GetName()
					}
				}
			});
			let a = new Derived(100);
			a.Print();
			a.CallProtected();
		}
	});

	testList.push({
		name: "protected-ctor-virt-call",
		desc: "Tests calling protected virtual from base (without trap flag).",
		exp: [
		"GetVirtualName: Base",
		 ],
		func: function(cout){
			let Base = env.Object.CreateClass("Base", {
				CONSTRUCTOR: function(){this.$.ProtPrint()},
				Protected: {
					ProtPrint: function(){
						cout("GetVirtualName: " + this.$.GetVirtualName())
					},
					$virtual$__GetVirtualName: function(){return "Base"}
				}
			});
			let Derived = env.Object.CreateClass("Derived", {
				CONSTRUCTOR: function(){},
				CrBaseClass: [Base],
				Protected: {
					$virtual$__GetVirtualName: function(){return "Derived"}
				}
			});
			let a = new Derived;
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prot-virt-topbase-diamond",
		desc: "A protected virtual function exists in top base only (diamond multiple inheritance)",
		exp: ["TopBase.SomeVirtualFunction"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {Test: function(){this.$.SomeVirtualFunction()}},
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("TopBase.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseA", {
				BaseClass: "TopBase",
				Functions: {Dummy(){;}}// to avoid useless class error in production mode
			});
			env.Object.RegisterClass("BaseB", {
				BaseClass: "TopBase",
				Functions: {Dummy2(){;}}// to avoid useless class error in production mode
			});
			let Derived = env.Object.CreateClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {Dummy3(){;}}// to avoid useless class error in production mode
			});
			let d = new Derived;
			d.Test();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prot-virt-all-diamond",
		desc: "A protected virtual function exists in every class, the derived resolving ambiguity (diamond multiple inheritance)",
		exp: ["Derived.SomeVirtualFunction"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {Test: function(){this.$.SomeVirtualFunction()}},
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("TopBase.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseA", {
				BaseClass: "TopBase",
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("BaseA.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseB", {
				BaseClass: "TopBase",
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("BaseB.SomeVirtualFunction")}},
			});
			let Derived = env.Object.CreateClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("Derived.SomeVirtualFunction")}},
			});
			let d = new Derived;
			d.Test();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prot-reabs-diamond",
		desc: "A protected virtual function present in every class is reabstracted in the immediate base of the derived causing no ambiguity (diamond multiple inheritance)",
		exp: ["Derived.SomeVirtualFunction"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {Test: function(){this.$.SomeVirtualFunction()}},
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("TopBase.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseA", {
				BaseClass: "TopBase",
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("BaseA.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseB", {
				BaseClass: "TopBase",
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("BaseB.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("PreDerived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Protected: {$abstract$__SomeVirtualFunction: function(){}},
			});
			let Derived = env.Object.CreateClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "PreDerived",
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("Derived.SomeVirtualFunction")}},
			});
			let d = new Derived;
			d.Test();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prot-virt-topbase-diamond-double",
		desc: "A protected virtual function exists in top base only (double diamond multiple inheritance)",
		exp: ["TopBase.SomeVirtualFunction"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {Test: function(){this.$.SomeVirtualFunction()}},
				Protected: {$virtual$__SomeVirtualFunction: function(){cout("TopBase.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("MidBaseA", {
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("MidBaseB", {
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("MidBaseC", {
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("LowBaseA", {
				CONSTRUCTOR: function(){},
				BaseClass: "MidBaseA, MidBaseB",
			});
			env.Object.RegisterClass("LowBaseB", {
				CONSTRUCTOR: function(){},
				BaseClass: "MidBaseB, MidBaseC",
			});
			let Derived = env.Object.CreateClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "LowBaseA, LowBaseB",
			});
			let d = new Derived;
			d.Test();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-prot-plain",
		desc: "Tests wrapping a class with protected plain function",
		exp: [
		"Base inst.$.ProtFunction present",
		"Base inst.$.NewProtFunction absent",
		"Base inst.$.OtherProtFunction present",
		"Derived inst.$.ProtFunction absent",
		"Derived inst.$.NewProtFunction present",
		"Derived inst.$.OtherProtFunction present",
		"ProtFunction", "OtherProtFunction",
		"ProtFunction", "OtherProtFunction",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Functions: {
					CallProtFunction: function(){
						this.$.ProtFunction();
						this.$.OtherProtFunction();
					},
				},
				Protected: {
					ProtFunction: function(){cout("ProtFunction")},
					OtherProtFunction: function(){cout("OtherProtFunction")},
				}
			});
			let BaseWrapper = env.Object.CreateWrapperClass("BaseWrapper", {
				Class: "Base",
				Functions: {ProtFunction: "NewProtFunction"}
			});
			let Derived = env.Object.CreateClass("Derived", {
				CrBaseClass: [BaseWrapper],
				Functions: {
					Test: function(){
						this.CallProtFunction();
						this.$.NewProtFunction();
						this.$.OtherProtFunction();
					},
				},
			});
			function testlayout(def){
			//	cout(def.$name+".jeepDef.prot.ProtFunction " + (def.jeepDef.prot.funcs.validFuncs["ProtFunction"] ? "present" : "absent"));
			//	cout(def.$name+".jeepDef.prot.NewProtFunction " + (def.jeepDef.prot.funcs.validFuncs["NewProtFunction"] ? "present" : "absent"));
				let d = new def;
				cout(def.$name+" inst.$.ProtFunction " + (undefined!=d.$.ProtFunction ? "present" : "absent"));
				cout(def.$name+" inst.$.NewProtFunction " + (undefined!=d.$.NewProtFunction ? "present" : "absent"));
				cout(def.$name+" inst.$.OtherProtFunction " + (undefined!=d.$.OtherProtFunction ? "present" : "absent"));
				return d;
			}
			let Base = JEEP.GetClass("Base")
			testlayout(Base);
			let d = testlayout(Derived)
			d.Test();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-prot-vars-free-acc",
		desc: "Tests wrapping a class with protected variables that have free access",
		exp: [
		"Base inst.$.value present",
		"Base inst.$.count present",
		"Base inst.$.number absent",
		"Derived inst.$.value absent",
		"Derived inst.$.count present",
		"Derived inst.$.number present",
		"Change", 
		"value: 100", "count: 33",
		"value: -5", "count: 33",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Functions: {
					Print: function(){
						cout("value: "+this.$.value)
						cout("count: "+this.$.count)
					},
					CallChange: function(v){this.Change(v)},
					Change: function(v){
						cout("Change")
						this.$.value = v;
					},
				},
				Protected: {
					value: -1,
					count: 33,
				}
			});
			let BaseWrapper = env.Object.CreateWrapperClass("BaseWrapper", {
				Class: "Base",
				Variables: {value: "number"}
			});
			let Derived = env.Object.CreateClass("Derived", {
				CrBaseClass: [BaseWrapper]
			})
			function testlayout(def){
				let d = new def;
				cout(def.$name+" inst.$.value " + (undefined!=d.$.value ? "present" : "absent"));
				cout(def.$name+" inst.$.count " + (undefined!=d.$.count ? "present" : "absent"));
				cout(def.$name+" inst.$.number " + (undefined!=d.$.number ? "present" : "absent"));
				return d;
			}
			let Base = JEEP.GetClass("Base")
			testlayout(Base);
			let d = testlayout(Derived)
			d.CallChange(100);// test old variable name linking
			d.Print();
			d.$.number = -5;// test new variable name linking
			d.Print();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-prot-vars-restr-acc",
		desc: "Tests wrapping a class with renaming protected variables that have restricted access",
		exp: [
		"Base inst.$.value present",
		"Base inst.$.count present",
		"Base inst.$.number absent",
		"Derived inst.$.value absent",
		"Derived inst.$.count present",
		"Derived inst.$.number present",
		"Change", 
		"value: 100", "count: 33",
		"value: -5", "count: 33",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Functions: {
					$const$__Print: function(){
						cout("value: "+this.$.value)
						cout("count: "+this.$.count)
					},
					CallChange: function(v){this.Change(v)},
					Change: function(v){
						cout("Change")
						this.$.value = v;
					},
				},
				Protected: {
					value: -1,
					count: 33,
				}
			});
			let BaseWrapper = env.Object.CreateWrapperClass("BaseWrapper", {
				Class: "Base",
				Variables: {value: "number"}
			});
			let Derived = env.Object.CreateClass("Derived", {
				CrBaseClass: [BaseWrapper]
			})
			function testlayout(def){
				let d = new def;
				cout(def.$name+" inst.$.value " + (undefined!=d.$.value ? "present" : "absent"));
				cout(def.$name+" inst.$.count " + (undefined!=d.$.count ? "present" : "absent"));
				cout(def.$name+" inst.$.number " + (undefined!=d.$.number ? "present" : "absent"));
				return d;
			}
			let Base = JEEP.GetClass("Base")
			testlayout(Base);
			let d = testlayout(Derived)
			d.CallChange(100);// test old variable name linking
			d.Print();
			d.$.number = -5;// test new variable name linking
			d.Print();
		}
	});

	if(env.IsDevMode())
	{
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "wrap-prot-plain-const",
			desc: "Tests wrapping a class with protected constant plain function",
			exp: [
				"JEEP run time error [class Derived]. The function 'Read' is declared constant but tried to modify the variable 'value'.",
			],
			func: function(cout){
				env.Object.RegisterClass("Base", {
					Protected: {
						value: -1,
						$const$__Read: function(){this.$.value = 0}
					}
				});
				let BaseWrapper = env.Object.CreateWrapperClass("BaseWrapper", {
					Class: "Base",
					Functions: {Read: "Write"}
				});
				let Derived = env.Object.CreateClass("Derived", {
					CrBaseClass: [BaseWrapper],
					Functions: {
						Test: function(){this.$.Write()}
					},
				});
				d = new Derived;
				d.Test();
			}
		});
	}

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-prot-virt",
		desc: "Tests wrapping a class with protected virtual function",
		exp: [
		"Base inst.$.ProtFunction present",
		"Base inst.$.NewProtFunction absent",
		"Derived inst.$.ProtFunction absent",
		"Derived inst.$.NewProtFunction present",
		"Derived.NewProtFunction", 
		"returned 100",
		"Derived.NewProtFunction"
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Functions: {
					CallProtFunction: function(){
						let r = this.$.ProtFunction();
						cout("returned "+r)
					},
				},
				Protected: {
					$virtual$__ProtFunction: function(){
						cout("Base.ProtFunction")
						return -1;
					}
				}
			});
			let BaseWrapper = env.Object.CreateWrapperClass("BaseWrapper", {
				Class: "Base",
				Functions: {ProtFunction: "NewProtFunction"}
			});
			let Derived = env.Object.CreateClass("Derived", {
				CrBaseClass: [BaseWrapper],
				Functions: {
					Test: function(){
						this.CallProtFunction();
						this.$.NewProtFunction();
					},
				},
				Protected: {
					$virtual$__NewProtFunction: function(){
						cout("Derived.NewProtFunction");
						return 100;
					}
				}
			});
			function testlayout(def){
			//	cout(def.$name+".jeepDef.prot.ProtFunction " + (def.jeepDef.prot.funcs.validFuncs["ProtFunction"] ? "present" : "absent"));
			//	cout(def.$name+".jeepDef.prot.NewProtFunction " + (def.jeepDef.prot.funcs.validFuncs["NewProtFunction"] ? "present" : "absent"));
				let d = new def;
				cout(def.$name+" inst.$.ProtFunction " + (undefined!=d.$.ProtFunction ? "present" : "absent"));
				cout(def.$name+" inst.$.NewProtFunction " + (undefined!=d.$.NewProtFunction ? "present" : "absent"));
				return d;
			}
			let Base = JEEP.GetClass("Base")
			testlayout(Base);
			let d = testlayout(Derived)
			d.Test();
		}
	});
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "wrap-prot-abs",
		desc: "Tests wrapping a class with protected abstract functions and replacing one of them",
		exp: [
		"JEEP run time error [class Base]. Instantiation failed due to unimplemented abstract functions.",
		"The abstract function 'getChangeValue' is not implemented.",
		"Base value changing to: 0",
		"Base value changing to: 100"
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Functions: {
					CallChange: function(){
						let v = this.$.getChangeValue();
						cout("Base value changing to: "+v)
					},
				},
				Protected: {
					$abstract$__getChangeValue: function(){},
				}
			});
			let BaseWrapper = env.Object.CreateWrapperClass("BaseWrapper", {
				Class: "Base",
				Functions: {getChangeValue: "GCV"}
			});
			let WrapperDerived = env.Object.CreateClass("WrapperDerived", {
				CrBaseClass: [BaseWrapper],
				Functions: {
					Test: function(){
						this.CallChange()
					},
				},
				Protected: {
					$virtual$__GCV: function(){return 100},
				}
			});
			let Derived = env.Object.CreateClass("Derived", {
				BaseClass: "Base",
				Functions: {
					Test: function(){
						this.CallChange()
					},
				},
				Protected: {
					$virtual$__getChangeValue: function(){return 0},
				}
			});
			// test that wrapping won't affect the definition of the wrapped class 
			let Base = JEEP.GetClass("Base")
			try{new Base}catch(e){}
			let d = new Derived;
			d.Test();
			// test the wrapping mechanism
			d = new WrapperDerived;
			d.Test();
		}
	});
}

TestEnvInfo.commonProtectedFail = function(env, testList)
{
	testList.push({
		name: "protected-const-func",
		desc: "Tests constantness of protected function",
		exp: [
		"JEEP run time error [class Class]. The function 'ProtPrint' is declared constant but tried to modify the variable 'value'.",
		 ],
		func: function(cout){
			let Class = env.Object.CreateClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){this.$.ProtPrint()},
				},
				Protected: {
					value: -1,
					$const$__ProtPrint: function(){this.$.value = 0},
				}
			});
			let c = new Class;
			c.Print();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prot-internal-varchange",
		desc: "Tests the internal variable change with protected functions.",
		exp: [
		"$.value: 10",  
		"c.$.value: -99", 
		"JEEP run time error [class Class]. The variable 'value' was attempted to be modified externally.",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("$.value: " + this.$.value)},
					Change: function(v){this.$.value=v},
				},
				Protected: {value: 10},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			c.Print();
			c.Change(-99);
			cout("c.$.value: " + c.$.value);
			c.$.value = 8;
		}
	});		

	if(env.IsDevMode())// these are syntax tests
	{
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "prot-getset-dup",
			desc: ".",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The function 'GetValue' is declared as both public and protected.",
			"The function 'SetValue' is declared as both public and protected.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					Variables: {$set_get$__value: 0},
					Protected: {
						pvalue: -33,
						GetValue: function(){return this.$.pvalue},
						SetValue: function(){return this.$.pvalue},
					}
				});
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "prot-decl-nodef",
			desc: "A virtual function is declared but not defined declare-define",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The protected function 'ProtPrint' is declared but not defined."
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					Protected: {
						$abstract$__AbstractFunction: function(){},
						$virtual$__ProtPrint: function(a,b,c){},
					}
				})
				env.Object.DefineClass("Class", {
					Protected: {
						$virtual$__Print: function(a,b,c){},
					},
					Functions: {
						$virtual$__ProtPrint: function(a,b,c){},
					}
				})
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "prot-var-decl",
			desc: "Tests arg type",
			exp: [
			"JEEP aborting from DeclareClass class [Class]. Protected variables are not allowed to be declared.",
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					Protected: {
						Print: "Array, Number, String",
					}
				})
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "prot-var directives",
			desc: "Tests that protected variables cannot have directives.",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"Protected variables cannot have get and set directives.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					Flags: "internal-variable-change",
					CONSTRUCTOR: function(){},
					Protected: {$set$__value: 10},
				});	
			}
		});		
		testList.push({
			name: "protected-public-func",
			desc: "Functions and variables are both public and protected",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The variable 'value' is declared as both public and protected.",
			"The function 'Print' is declared as both public and protected.",
			 ],
			func: function(cout){
				env.Object.CreateClass("Class", {
					CONSTRUCTOR: function(){},
					Variables: {value: 0},
					Functions: {
						Print: function(){this.$.Print()},
					},
					Protected: {
						value: 0,
						Print: function(){},
						$abstract$__GetAbstractName: function(){},
						$virtual$__GetVirtualName: function(){return "Base"}
					}
				});
			}
		});

		testList.push({
			name: "protected-dup-func",
			desc: "Protected members declared multiple times in the hierarchy.",
			exp: [
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The variable 'value' is declared multiple times in the hierarchy [Derived, Base].",
			"The function 'Print' is declared multiple times in the hierarchy [Derived, Base].",
			 ],
			func: function(cout){
				let Base = env.Object.CreateClass("Base", {
					CONSTRUCTOR: function(){},
					Functions: {
						PubPrint: function(){this.$.Print()},
					},
					Protected: {
						value: 0,
						Print: function(){
						},
						$abstract$__GetAbstractName: function(){},
						$virtual$__GetVirtualName: function(){return "Base"}
					}
				});
				let Derived = env.Object.CreateClass("Derived", {
					CONSTRUCTOR: function(){},
					CrBaseClass: [Base],
					Functions: {
						CallProtected: function(){this.$.Print()},
					},
					Protected: {
						value: 0,
						Print: function(){},
						$virtual$__GetAbstractName: function(){return "Derived"},
						$virtual$__GetVirtualName: function(){
							return "Derived+"+this.$base.Base.GetVirtualName()
						}
					}
				});
			}
		});

		testList.push({
			name: "prot-virt-der-novirt",
			desc: "The base class protected virtual function is made non virtual in derived class.",
			exp: [
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The protected virtual function 'GetVirtualName' declared in base class [Base] is declared as non virtual in derived class [Derived].",
			 ],
			func: function(cout){
				let Base = env.Object.CreateClass("Base", {
					CONSTRUCTOR: function(){},
					Functions: {
						Print: function(){},
					},
					Protected: {
						$virtual$__GetVirtualName: function(){return "Base"}
					}
				});
				let Derived = env.Object.CreateClass("Derived", {
					CONSTRUCTOR: function(){},
					CrBaseClass: [Base],
					Protected: {
						GetVirtualName: function(){return "Derived"}
					},
				});
			}
		});

		testList.push({
			name: "prot-novirt-der-virt",
			desc: "The base class protected virtual function is made non virtual in derived class.",
			exp: [
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The protected non virtual function 'GetVirtualName' declared in base class [Base] is declared as virtual in derived class [Derived].",
			 ],
			func: function(cout){
				let Base = env.Object.CreateClass("Base", {
					CONSTRUCTOR: function(){},
					Functions: {
						Print: function(){},
					},
					Protected: {
						GetVirtualName: function(){return "Base"}
					}
				});
				let Derived = env.Object.CreateClass("Derived", {
					CONSTRUCTOR: function(){},
					CrBaseClass: [Base],
					Protected: {
						$virtual$__GetVirtualName: function(){return "Derived"}
					},
				});
			}
		});

		testList.push({
			name: "prot-base-pub-der",
			desc: "The base class protected function is made public in derived class.",
			exp: [
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The protected function 'SomeFunction' declared in base class [Base] is declared as public in derived class [Derived].",
			"The protected function 'AnotherFunction' declared in base class [Base] is declared as public in derived class [Derived].",
			"The function 'SomeFunction' is declared 'virtual' in base class [Base] but not in derived class [Derived].",
			 ],
			func: function(cout){
				let Base = env.Object.CreateClass("Base", {
					CONSTRUCTOR: function(){},
					Protected: {
						$virtual$__SomeFunction: function(){return "Base"},
						AnotherFunction: function(){return "Base"}
					},
				});
				let Derived = env.Object.CreateClass("Derived", {
					CONSTRUCTOR: function(){},
					CrBaseClass: [Base],
					Functions: {
						Print: function(){},
						SomeFunction: function(){return "Base"},
						$virtual$__AnotherFunction: function(){return "Base"}
					},
				});
			}
		});

		testList.push({
			name: "prot-der-pub-base",
			desc: "The base class public function is made protected in derived class.",
			exp: [
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The public function 'SomeFunction' declared in base class [Base] is declared as protected in derived class [Derived].",
			"The public function 'AnotherFunction' declared in base class [Base] is declared as protected in derived class [Derived].",
			 ],
			func: function(cout){
				let Base = env.Object.CreateClass("Base", {
					CONSTRUCTOR: function(){},
					Functions: {
						Print: function(){},
						$virtual$__SomeFunction: function(){return "Base"},
						AnotherFunction: function(){return "Base"}
					},
				});
				let Derived = env.Object.CreateClass("Derived", {
					CONSTRUCTOR: function(){},
					CrBaseClass: [Base],
					Protected: {
						SomeFunction: function(){return "Base"},
						$virtual$__AnotherFunction: function(){return "Base"}
					},
				});
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "prot-virt-dup",
			desc: "A protected virtual function exists in multiple bases of different lines",
			exp: [
				"JEEP couldn't generate the class [Derived] due to the following errors.",
				"The virtual function 'SomeVirtualFunction' is declared multiple times in the hierarchy [BaseA, BaseB].",
			],
			func: function(cout){
				env.Object.RegisterClass("BaseA", {
					Protected: {$virtual$__SomeVirtualFunction: function(){cout("BaseA.SomeVirtualFunction")}},
				});
				env.Object.RegisterClass("BaseB", {
					Protected: {$virtual$__SomeVirtualFunction: function(){cout("BaseB.SomeVirtualFunction")}},
				});
				let Derived = env.Object.CreateClass("Derived", {
					CONSTRUCTOR: function(){},
					BaseClass: "BaseA, BaseB",
				});
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "prot-abs-dup",
			desc: "A protected virtual function exists in multiple bases of different lines",
			exp: [
				"JEEP couldn't generate the class [Derived] due to the following errors.",
				"The virtual function 'SomeVirtualFunction' is declared multiple times in the hierarchy [BaseA, BaseB].",
			],
			func: function(cout){
				env.Object.RegisterClass("BaseA", {
					Protected: {$abstract$__SomeVirtualFunction: function(){}},
				});
				env.Object.RegisterClass("BaseB", {
					Protected: {$abstract$__SomeVirtualFunction: function(){}},
				});
				let Derived = env.Object.CreateClass("Derived", {
					CONSTRUCTOR: function(){},
					BaseClass: "BaseA, BaseB",
				});
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "prot-virt-ambi",
			desc: "A virtual function repeats in multiple bases of same line (diamond multiple inheritance)",
			exp: [	
				"JEEP couldn't generate the class [Derived] due to the following errors.",
				"The virtual function 'SomeFunction' is ambiguous as it is present in multiple base classes [BaseA, BaseB].",
			],
			func: function(cout){
				env.Object.RegisterClass("TopBase", {
					Protected: {$virtual$__SomeFunction: function(){}},
				});
				env.Object.RegisterClass("BaseA", {
					BaseClass: "TopBase",
					Protected: {$virtual$__SomeFunction: function(){}},
				});
				env.Object.RegisterClass("BaseB", {
					BaseClass: "TopBase",
					Protected: {$virtual$__SomeFunction: function(){}},
				});
				env.Object.RegisterClass("Derived", {
					CONSTRUCTOR: function(){},
					BaseClass: "BaseA, BaseB",
				});
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "wrap-novars-prot",
			desc: "Tests wrapping non existing variables with protected.",
			exp: [
			"JEEP aborting from CreateWrapperClass. The specification given is invalid.",
			"The function 'Change' does not exist in the class [Class].",
			"The variable 'value' does not exist in the class [Class].",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					Protected: {count: 0, Print: function(){},},
				});
				let Wrapper = env.Object.CreateWrapperClass("Wrapper", {
					Class: "Class",
					Functions: {Change: "Modify"},
					Variables: {value: "val"}
				});
				let Class = env.Object.CreateClass("Derived", {
					CrBaseClass: [Wrapper]
				})
			}
		});
	}

	testList.push({
		name: "prot-abstract",
		desc: "Instatiating class with protected abstract.",
		exp: [
		"JEEP run time error [class Class]. Instantiation failed due to unimplemented abstract functions.",
		"The abstract function 'SomeFunction' is not implemented.",
		 ],
		func: function(cout){
			let Class = env.Object.CreateClass("Class", {
				CONSTRUCTOR: function(){},
				Protected: {
					$abstract$__SomeFunction: function(){},
				},
			});
			new Class;
		}
	});

	testList.push({
		name: "prot-abstract-base",
		desc: "Instatiating class with unimplemented inherited protected abstract.",
		exp: [
		"JEEP run time error [class Derived]. Instantiation failed due to unimplemented abstract functions.",
		"The abstract function 'SomeFunction' declared in base [Base] is not implemented.",
		 ],
		func: function(cout){
			let Base = env.Object.CreateClass("Base", {
				CONSTRUCTOR: function(){},
				Protected: {
					$abstract$__SomeFunction: function(){},
				},
			});
			let Derived = env.Object.CreateClass("Derived", {
				CrBaseClass: [Base],
			});
			new Derived;
		}
	});
}

TestEnvInfo.passtest_Private = function(env, testList)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "private functions and variables with directive (register)",
		desc: ".",
		exp: [
			"private value accessed from CONSTRUCTOR: -33",
			"public value: 100",
			"private value via direct access: -33",
			"private value via private function: -33",
			"public value via private function: 100",
			"private function access private function: -133",
			"a.GetPublicValue absent",
			"a.GetPublicValue is not a function",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "constructor-using-private-members",
				CONSTRUCTOR: function(){
					cout("private value accessed from CONSTRUCTOR: "+this.$$.value);
				},
				Functions: {
					$usepriv$__Test: function(){
						cout("public value: "+this.GetValue());
						cout("private value via direct access: "+this.$$.value);
						cout("private value via private function: "+this.$$.GetValue());
						cout("public value via private function: "+this.$$.GetPublicValue());
						cout("private function access private function: "+this.$$.PrivAccessPriv());
					},
				},
				Variables: {$get$__value: 100},
				Private: {
					value: -33,
					GetValue: function(){return this.$$.value},
					GetPublicValue: function(){return this.value;},
					PrivAccessPriv: function(){return this.$$.GetValue() - this.$$.GetPublicValue()},
				}
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
			a.Test();
			cout("a.GetPublicValue "+(a.GetPublicValue === undefined ? "absent" : "present"));
			try{a.GetPublicValue()}catch(e){cout(e.message)}
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "private functions and variables with directive (declare define)",
		desc: ".",
		exp: [
		"public value: 100",
		"private value via direct access: -33",
		"private value via private function: -33",
		"public value via private function: 100",
		"private function access private function: -133",
		"a.GetPublicValue absent",
		"a.GetPublicValue is not a function",
		],
		func: function(cout){
			env.Object.DeclareClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					Test: function(){},
					GetValue: function(){},
				}
			});
			env.Object.DefineClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					$usepriv$__Test: function(){
						cout("public value: "+this.GetValue());
						cout("private value via direct access: "+this.$$.value);
						cout("private value via private function: "+this.$$.GetValue());
						cout("public value via private function: "+this.$$.GetPublicValue());
						cout("private function access private function: "+this.$$.PrivAccessPriv());
					},
				},
				Variables: {$get$__value: 100},
				Private: {
					value: -33,
					GetValue: function(){return this.$$.value},
					GetPublicValue: function(){return this.value;},
					PrivAccessPriv: function(){return this.$$.GetValue() - this.$$.GetPublicValue()},
				}
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
			a.Test();
			cout("a.GetPublicValue "+(a.GetPublicValue === undefined ? "absent" : "present"));
			try{a.GetPublicValue()}catch(e){cout(e.message)}
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "private functions and variables with flag",
		desc: ".",
		exp: [
		"public value: 100",
		"private value via direct access: -33",
		"private value via private function: -33",
		"public value via private function: 100",
		"private function access private function: -133",
		"a.GetPublicValue absent",
		"a.GetPublicValue is not a function",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "using-private-members",
				CONSTRUCTOR: function(v){this.value=v},
				Functions: {
					Test: function(){
						cout("public value: "+this.GetValue());
						cout("private value via direct access: "+this.$$.value);
						cout("private value via private function: "+this.$$.GetValue());
						cout("public value via private function: "+this.$$.GetPublicValue());
						cout("private function access private function: "+this.$$.PrivAccessPriv());
					},
				},
				Variables: {$get$__value: 0},
				Private: {
					value: -33,
					GetValue: function(){return this.$$.value},
					GetPublicValue: function(){return this.value;},
					PrivAccessPriv: function(){return this.$$.GetValue() - this.$$.GetPublicValue()},
				}
			});
			let A = JEEP.GetClass("Class");
			let a = new A(100);
			a.Test();
			cout("a.GetPublicValue "+(a.GetPublicValue === undefined ? "absent" : "present"));
			try{a.GetPublicValue()}catch(e){cout(e.message)}
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "private functions and variables in single inheritance",
		desc: ".",
		exp: [
		"public value: 100",
		"private value via direct access: -33",
		"private value via private function: -33",
		"public value via private function: 100",
		"--- calling base",
		"public value: 1234",
		"private value via direct access: -77",
		"private value via private function: -77",
		"public value via private function: 1234",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					$usepriv$__BaseTest: function(){
						cout("public value: "+this.GetBvalue());
						cout("private value via direct access: "+this.$$.value);
						cout("private value via private function: "+this.$$.GetValue());
						cout("public value via private function: "+this.$$.GetPublicValue());
					},
				},
				Variables: {$get$__bvalue: 1234},
				Private: {
					value: -77,
					GetValue: function(){return this.$$.value},
					GetPublicValue: function(){return this.bvalue;},
				}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {
					$usepriv$__Test: function(){
						cout("public value: "+this.GetValue());
						cout("private value via direct access: "+this.$$.value);
						cout("private value via private function: "+this.$$.GetValue());
						cout("public value via private function: "+this.$$.GetPublicValue());
						cout("--- calling base");
						this.BaseTest();
					},
				},
				Variables: {$get$__value: 100},
				Private: {
					value: -33,
					GetValue: function(){return this.$$.value},
					GetPublicValue: function(){return this.value;},
				}
			});
			let A = JEEP.GetClass("Derived");
			let a = new A;
			a.Test();
		}
	});

	testList.push({
	//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "private function directives combination",
		desc: "Tests function directives for private functions.",
		exp: [
		"Class CONSTRUCTOR", 
		"Class CONSTRUCTOR", "scope and nothing", "Class DESTRUCTOR",
		"Class CONSTRUCTOR", "scope and pub const", 
		"JEEP run time error [class Class]. The function 'Print' is declared constant but tried to modify the variable 'value'.",
		"Class DESTRUCTOR",
		"Class CONSTRUCTOR", "scope and priv const", 
		"JEEP run time error [class Class]. The function 'Print' is declared constant but tried to modify the variable 'privvalue'.",
		"Class DESTRUCTOR",
		"Class CONSTRUCTOR", "scope and argconst", "Class DESTRUCTOR", "m.modArg: true",
		"JEEP run time error [class Class]. The function 'Print' is declared to take 3 arguments but invoked with 1.",
		"Class CONSTRUCTOR", "scope and replace", "Class DESTRUCTOR", "this.$base is undefined",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){cout("Class CONSTRUCTOR")},
				DESTRUCTOR: function(){cout("Class DESTRUCTOR")},
				Functions: { 
					$usepriv$__Test: function(){
						// scope only
						this.$$.Print("scope", "nothing", null);
						// scope + test const
						try{this.$$.Print("scope", "pub const", {modPubObject: true});}catch(e){}
						try{this.$$.Print("scope", "priv const", {modPrivObject: true});}catch(e){}
						// scope + test argconst
						let m = {modArg: true};
						this.$$.Print("scope", "argconst", m);
						cout("m.modArg: " +(m.modArg?"true":"false"));
						// test argnum
						try{this.$$.Print("scope");}catch(e){}
						// test replace
						try{this.$$.Print("scope", "replace", {callBase: true});}catch(e){cout(e.message)}
					}
				},
				Variables: {value: 0},
				Private: {
					privvalue: 0,
					$scoped_const_argconst_argnum$___Print: function(what, which, f){
						this.$def.ScopedCreate();
						cout(what +" and "+ which);
						if(f)
						{
							if(f.modArg)
								f.modArg = false;
							else if(f.modPubObject)
								this.value = 0;
							else if(f.modPrivObject)
								this.$$.privvalue = 0;
							else if(f.callBase)
								this.$base.Base.Print(what, which, f);
						}
					},
				},
			});
			let A = JEEP.GetClass("Class");
			let a = new A;
			a.Test();
		}
	});

	testList.push({
	//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "private function directives combination with inheritance",
		desc: "Tests function directives for private functions.",
		exp: [
		"Base CONSTRUCTOR", "Derived CONSTRUCTOR", 
		"Base CONSTRUCTOR", "Derived CONSTRUCTOR", 
		"scope and nothing", 
		"Derived DESTRUCTOR", "Base DESTRUCTOR",
		"Base CONSTRUCTOR", "Derived CONSTRUCTOR", 
		"scope and pub const", 
		"JEEP run time error [class Derived]. The function 'Print' is declared constant but tried to modify the variable 'bvalue'.",
		"Derived DESTRUCTOR", "Base DESTRUCTOR",
		"Base CONSTRUCTOR", "Derived CONSTRUCTOR", 
		"scope and priv const", 
		"JEEP run time error [class Derived]. The function 'Print' is declared constant but tried to modify the variable 'privvalue'.",
		"Derived DESTRUCTOR", "Base DESTRUCTOR",
		"Base CONSTRUCTOR", "Derived CONSTRUCTOR", 
		"scope and argconst", 
		"Derived DESTRUCTOR", "Base DESTRUCTOR", 
		"m.modArg: true",
		"JEEP run time error [class Derived]. The function 'Print' is declared to take 3 arguments but invoked with 1.",
		"Base CONSTRUCTOR", "Derived CONSTRUCTOR",
		"scope and nothing", 
		"Derived DESTRUCTOR", "Base DESTRUCTOR",
		"Base CONSTRUCTOR", "Derived CONSTRUCTOR", 
		"scope and pub const", 
		"JEEP run time error [class Derived]. The function 'Print' is declared constant but tried to modify the variable 'value'.",
		"Derived DESTRUCTOR", "Base DESTRUCTOR",
		"Base CONSTRUCTOR", "Derived CONSTRUCTOR", 
		"scope and priv const", 
		"JEEP run time error [class Derived]. The function 'Print' is declared constant but tried to modify the variable 'privvalue'.",
		"Derived DESTRUCTOR", "Base DESTRUCTOR",
		"Base CONSTRUCTOR", "Derived CONSTRUCTOR", 
		"scope and argconst", 
		"Derived DESTRUCTOR", "Base DESTRUCTOR", 
		"m.modArg: true",
		"JEEP run time error [class Derived]. The function 'Print' is declared to take 3 arguments but invoked with 1.",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){cout("Base CONSTRUCTOR")},
				DESTRUCTOR: function(){cout("Base DESTRUCTOR")},
				Functions: { 
					$usepriv$__TestBase: function(){
						// scope only
						this.$$.Print("scope", "nothing", null);
						// scope + test const
						try{this.$$.Print("scope", "pub const", {modPubObject: true});}catch(e){}
						try{this.$$.Print("scope", "priv const", {modPrivObject: true});}catch(e){}
						// scope + test argconst
						let m = {modArg: true};
						this.$$.Print("scope", "argconst", m);
						cout("m.modArg: " +(m.modArg?"true":"false"));
						// test argnum
						try{this.$$.Print("scope");}catch(e){}
					}
				},
				Variables: {bvalue: 0},
				Private: {
					privvalue: 0,
					$scoped_const_argconst_argnum$___Print: function(what, which, f){
						this.$def.ScopedCreate();
						cout(what +" and "+ which);
						if(f)
						{
							if(f.modArg)
								f.modArg = false;
							else if(f.modPubObject)
								this.bvalue = 0;
							else if(f.modPrivObject)
								this.$$.privvalue = 0;
						}
					},
				},
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "Base",
				CONSTRUCTOR: function(){cout("Derived CONSTRUCTOR")},
				DESTRUCTOR: function(){cout("Derived DESTRUCTOR")},
				Functions: { 
					$usepriv$__TestDerived: function(){
						// scope only
						this.$$.Print("scope", "nothing", null);
						// scope + test const
						try{this.$$.Print("scope", "pub const", {modPubObject: true});}catch(e){}
						try{this.$$.Print("scope", "priv const", {modPrivObject: true});}catch(e){}
						// scope + test argconst
						let m = {modArg: true};
						this.$$.Print("scope", "argconst", m);
						cout("m.modArg: " +(m.modArg?"true":"false"));
						// test argnum
						try{this.$$.Print("scope");}catch(e){}
					}
				},
				Variables: {value: 0},
				Private: {
					privvalue: 0,
					$scoped_const_argconst_argnum$___Print: function(what, which, f){
						this.$def.ScopedCreate();
						cout(what +" and "+ which);
						if(f)
						{
							if(f.modArg)
								f.modArg = false;
							else if(f.modPubObject)
								this.value = 0;
							else if(f.modPrivObject)
								this.$$.privvalue = 0;
						}
					},
				},
			});
			let A = JEEP.GetClass("Derived");
			let a = new A;
			a.TestBase();
			a.TestDerived();
		}
	});
}

TestEnvInfo.failtest_Private = function(env, testList)
{
	if(env.IsDevMode())
	{
		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "private declared",
			desc: ".",
			exp: [
			"JEEP error in DeclareClass for class [Class]. Private members are not allowed to be declared."
			],
			func: function(cout){
				env.Object.DeclareClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {
						Test: function(){}
					},
					Private: {
						value: -33,
						GetValue: function(){return this.$$.value},
						GetPublicValue: function(){return this.value;},
						PrivAccessPriv: function(){return this.$$.GetValue() - this.$$.GetPublicValue()},
					}
				});
			}
		});

		testList.push({
			//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
			name: "private functions with abstract, virtual and replace directives",
			desc: "",
			exp: [
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The private function 'Abs' is declared abstract.",
			"The private function 'Vir' is declared virtual.",
			"The private function 'VirtualReplace' is declared virtual and replace.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					Functions: {$usepriv$__f(){}},
					Private: {
						$abstract$__Abs: function(obj){},
						$virtual$__Vir: function(obj){},
						$virtual_replace$__VirtualReplace: function(obj){},
					},
				});	
			}
		});		
	}

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "argtype-private",
		desc: "Tests arg type in static (count, arr, num, rec, struct, class)",
		exp: [
		"JEEP run time error [class Class]. The function 'Print' expects 5 number of argument(s).",
		"JEEP run time error [class Class]. The function 'Print' expects 'number' type for argument 0.",
		"JEEP run time error [class Class]. The function 'Print' expects 'array' type for argument 1.",
		"JEEP run time error [class Class]. The function 'Print' expects 'record Record' type for argument 2 but it is not registered.",
		"JEEP run time error [class Class]. The function 'Print' expects 'struct Struct' type for argument 3 but it is not registered.",
		"JEEP run time error [class Class]. The function 'Print' expects 'class Class' type for argument 4 but it is not registered.",
		],
		func: function(cout){
			let C = env.Object.CreateClass("Class", {
				Functions: {
					$usepriv$__Test: function(){
						try{this.$$.Print()}catch(e){}
						try{this.$$.Print("a")}catch(e){}
						try{this.$$.Print(1,2)}catch(e){}
						try{this.$$.Print(1,[2],3)}catch(e){}
						env.Object.RegisterRecord("Record", {dummy: 0})
						let Record = JEEP.GetRecord("Record");
						try{this.$$.Print(1,[2],Record.New(), 4)}catch(e){}
						env.Object.RegisterStruct("Struct", {Variables: {dummy: 0}})
						let Struct = JEEP.GetStruct("Struct");
						try{this.$$.Print(1,[2],Record.New(), Struct.New(), 5)}catch(e){}						
					}
				},
				Private: {
					$Print: "Number, Array, record.Record, struct.Struct, class.Class",
					Print: function(num, arr, rec, str, cls){}
				}
			})
			let c = new C;
			c.Test();
		}
	});
}

TestEnvInfo.passtest_Hierarchy = function(env, testList)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "replaced virtual function",
		desc: "Tests that replace directive for virtual function doesn't save base function.",
		exp: [
			"baseClass.Base absent", 
			"unable to access baseClass.Base", 
			"unable to access baseClass.Base.GetName",
			"Print: Derived",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("Print: " + this.GetName())},
					$virtual$__GetName: function(){}
				}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {
					$virtual_replace$__GetName: function(){
						try{this.$base.Base}catch(e){cout("unable to access baseClass.Base")}
						try{this.$base.Base.GetName()}catch(e){cout("unable to access baseClass.Base.GetName")}
						return "Derived";
					}
				}
			});
			let A = JEEP.GetClass("Derived");
			let a = new A;
			cout((a.$base && a.$base.Base) ? "baseClass.Base present" : "baseClass.Base absent");
			a.Print();// more robust test
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "replaced virtual function with further inheritance",
		desc: "Tests that replace directive for virtual function doesn't change the virtualness.",
		exp: ["Print: Derived->MidBase"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("Print: " + this.GetName())},
					$virtual$__GetName: function(){}
				}
			});
			env.Object.RegisterClass("MidBase", {
				CONSTRUCTOR: function(){},
				BaseClass: "TopBase",
				Functions: {
					$virtual_replace$__GetName: function(){return "MidBase";}
				}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "MidBase",
				Functions: {
					$virtual$_GetName: function(){
						return "Derived->" + this.$base.MidBase.GetName();
					}
				}
			});
			let A = JEEP.GetClass("Derived");
			let a = new A;
			a.Print();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "replaced virtual function from constructor",
		desc: "Tests that replace directive for virtual function doesn't enable polymorphism from constructor.",
		exp: ["Base CONSTRUCTOR","Print: Base"],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){cout("Base CONSTRUCTOR");this.Print()},
				Functions: {
					Print: function(){cout("Print: " + this.GetName())},
					$virtual$__GetName: function(){return "Base"}
				}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {
					$virtual_replace$__GetName: function(){return "Derived"}
				}
			});
			let A = JEEP.GetClass("Derived");
			let a = new A;
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "replace-virtual-functions flag",
		desc: "Tests the replace-virtual-functions flag with further inheritance.",
		exp: ["unable to access baseClass.Base", "unable to access baseClass.Base.GetName","Print: Derived"],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("Print: " + this.GetName())},
					$virtual$__GetName: function(){}
				}
			});
			env.Object.RegisterClass("Derived", {
				Flags: "replace-virtual-functions",
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {
					$virtual_replace$__GetName: function(){
						try{this.$base.Base}catch(e){cout("unable to access baseClass.Base")}
						try{this.$base.Base.GetName()}catch(e){cout("unable to access baseClass.Base.GetName")}
						return "Derived";
					}
				}
			});
			let A = JEEP.GetClass("Derived");
			let a = new A;
			a.Print();
		}
	});

	testList.push({
		name: "abstract function (register)",
		desc: "Tests abstract function mechanism with register method.",
		exp: ["Print: Derived"],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("Print: " + this.GetName())},
					$abstract$__GetName: function(){}
				}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {$virtual$__GetName: function(){return "Derived"}}
			});
			let A = JEEP.GetClass("Derived");
			let a = new A;
			a.Print();
		}
	});

	testList.push({
		name: "abstract function (declare-define)",
		desc: "Tests abstract function mechanism with declare-define method.",
		exp: ["Print: Derived"],
		func: function(cout){
			env.Object.DeclareClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){},
					$abstract$__GetName: function(){}
				}
			});				
			env.Object.DefineClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("Print: " + this.GetName())},
				}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass:"Base",
				Functions: {$virtual$__GetName: function(){return "Derived"}}
			});
			let A = JEEP.GetClass("Derived");
			let a = new A;
			a.Print();
		}
	});
	
	testList.push({
		name: "abstract function retained in derived",
		desc: "Tests that an abstract function can be retained in middle bases.",
		exp: ["Print: Derived"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("Print: " + this.GetName())},
					$abstract$__GetName: function(){}
				}
			});
			env.Object.RegisterClass("MidBase", {
				CONSTRUCTOR: function(){},
				BaseClass: "TopBase",
				Functions: {
					$abstract$__GetName: function(){}
				}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "MidBase",
				Functions: {$virtual$__GetName: function(){return "Derived"}}
			});
			let A = JEEP.GetClass("Derived");
			let a = new A;
			a.Print();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "immediate base class objects (no ancestor access)",
		desc: "Tests that only immediate base objects are created in default mode when no need-ancestor-access flag is given",
		exp: [
		"Derived.$base.BaseB: present",
		"Derived.$base.BaseA: present",
		"Derived.$base.BaseX: absent",
		"Derived.$base.TopBase: absent",
		"Derived.Print","BaseA.Print","BaseB.Print",
		"this.$base.BaseX access error",
		"this.$base.TopBase access error",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(){},
				Functions: {$virtual$__Print: function(){}}
			});
			;
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(){},
				BaseClass: "TopBase",
				Functions: {$virtual$__Print: function(){}}
			});
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
				Functions: {$virtual$__Print: function(){cout("BaseA.Print")}}
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
				Functions: {$virtual$__Print: function(){cout("BaseB.Print")}}
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {
					$virtual$__Print: function(){
						cout("Derived.Print");
						try{this.$base.BaseA.Print()}catch(e){cout("this.$base.BaseA access error")}
						try{this.$base.BaseB.Print()}catch(e){cout("this.$base.BaseB access error")}
						try{this.$base.BaseX.Print()}catch(e){cout("this.$base.BaseX access error")}
						try{this.$base.TopBase.Print()}catch(e){cout("this.$base.TopBase access error")}
					}
				}
			});
			let Derived = JEEP.GetClass("Derived");
			let proto = Derived.prototype;
			cout("Derived.$base.BaseB: " + (proto.$base && proto.$base.BaseB ? "present" : "absent"))
			cout("Derived.$base.BaseA: " + (proto.$base && proto.$base.BaseA ? "present" : "absent"))
			cout("Derived.$base.BaseX: " + (proto.$base && proto.$base.BaseX ? "present" : "absent"))
			cout("Derived.$base.TopBase: " + (proto.$base && proto.$base.TopBase ? "present" : "absent"))
			let d = new Derived;
			d.Print();// more robust test
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "immediate base class objects (with ancestor access)",
		desc: "Tests that all base objects are created when need-ancestor-access flag is given",
		exp: [
		"Derived.$base.BaseB: present",
		"Derived.$base.BaseA: present",
		"Derived.$base.BaseX: present",
		"Derived.$base.TopBase: present",
		"Derived.Print", "BaseA.Print", "BaseB.Print", "BaseX.Print", "TopBase.Print",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(){},
				Functions: {$virtual$__Print: function(){cout("TopBase.Print")}}
			});
			;
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(){},
				BaseClass: "TopBase",
				Functions: {$virtual$__Print: function(){cout("BaseX.Print")}}
			});
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
				Functions: {$virtual$__Print: function(){cout("BaseA.Print")}}
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
				Functions: {$virtual$__Print: function(){cout("BaseB.Print")}}
			});
			;
			env.Object.RegisterClass("Derived", {
				Flags: "need-ancestor-access",
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {
					$virtual$__Print: function(){
						cout("Derived.Print");
						this.$base.BaseA.Print();
						this.$base.BaseB.Print();
						this.$base.BaseX.Print();
						this.$base.TopBase.Print();
					}
				}
			});
			let Derived = JEEP.GetClass("Derived");
			let proto = Derived.prototype;
			cout("Derived.$base.BaseB: " + (proto.$base && proto.$base.BaseB ? "present" : "absent"))
			cout("Derived.$base.BaseA: " + (proto.$base && proto.$base.BaseA ? "present" : "absent"))
			cout("Derived.$base.BaseX: " + (proto.$base && proto.$base.BaseX ? "present" : "absent"))
			cout("Derived.$base.TopBase: " + (proto.$base && proto.$base.TopBase ? "present" : "absent"))
			let d = new Derived;
			d.Print();// more robust test
		}
	});
	testList.push({
		name: "partial destruction on failed instantiation of some base in diamond and shaft multiple inheritance",
		desc: "Tests that only the constructed portions have the destructors called in a complex multiple inheritance.",
		exp: [
			"BaseX CONSTRUCTOR args 74", "TopBase CONSTRUCTOR args 74", 
			"TopBase DESTRUCTOR args 74", "BaseX DESTRUCTOR args 74", 
			"The class 'Derived' failed to instantiate at base 'MidBaseA'."
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(a){cout("TopBase CONSTRUCTOR args " + a);this.baval = a},
				DESTRUCTOR: function (){cout("TopBase DESTRUCTOR args " + this.baval);},
				Variables: {baval: -1},
			});
			;
			env.Object.RegisterClass("MidBaseA", {
				CONSTRUCTOR: function(a){return false},
				DESTRUCTOR: function (){cout("MidBaseA DESTRUCTOR args " + this.bbval);},
				BaseClass: "TopBase",
				Variables: {bbval: -1},
			});
			;
			env.Object.RegisterClass("MidBaseB", {
				CONSTRUCTOR: function(a){cout("MidBaseB CONSTRUCTOR args " + a);this.bcval = a},
				DESTRUCTOR: function (){cout("MidBaseB DESTRUCTOR args " + this.bcval);},
				BaseClass: "TopBase",
				Variables: {bcval: -1},
			});
			;
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(a){cout("BaseX CONSTRUCTOR args " + a);this.bxval = a},
				DESTRUCTOR: function (){cout("BaseX DESTRUCTOR args " + this.bxval);},
				Variables: {bxval: -1},
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(a){cout("Derived CONSTRUCTOR args " + a);this.val = a},
				DESTRUCTOR: function (){cout("Derived DESTRUCTOR args " + this.val);},
				BaseClass: "BaseX, MidBaseA, MidBaseB",
				Variables: {val: -1},
			});
			;
			env.Function.ScopedCall(function(){
				let Derived = JEEP.GetClass("Derived");
				try{Derived.ScopedCreate(74)}
				catch(e){cout(e.message)}
			});
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "partial destruction when some base constructor throws in diamond and shaft multiple inheritance",
		desc: "Tests that only the constructed portions have the destructors called in a complex multiple inheritance.",
		exp: [
			"BaseX CONSTRUCTOR args 74", "TopBase CONSTRUCTOR args 74", 
			"TopBase DESTRUCTOR args 74", "BaseX DESTRUCTOR args 74", 
			"The class 'Derived' failed to instantiate at base 'MidBaseA' due to the exception <bad base>."
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(a){cout("TopBase CONSTRUCTOR args " + a);this.baval = a},
				DESTRUCTOR: function (){cout("TopBase DESTRUCTOR args " + this.baval);},
				Variables: {baval: -1},
			});
			;
			env.Object.RegisterClass("MidBaseA", {
				CONSTRUCTOR: function(a){throw "bad base"},
				DESTRUCTOR: function (){cout("MidBaseA DESTRUCTOR args " + this.bbval);},
				BaseClass: "TopBase",
				Variables: {bbval: -1},
			});
			;
			env.Object.RegisterClass("MidBaseB", {
				CONSTRUCTOR: function(a){cout("MidBaseB CONSTRUCTOR args " + a);this.bcval = a},
				DESTRUCTOR: function (){cout("MidBaseB DESTRUCTOR args " + this.bcval);},
				BaseClass: "TopBase",
				Variables: {bcval: -1},
			});
			;
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(a){cout("BaseX CONSTRUCTOR args " + a);this.bxval = a},
				DESTRUCTOR: function (){cout("BaseX DESTRUCTOR args " + this.bxval);},
				Variables: {bxval: -1},
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(a){cout("Derived CONSTRUCTOR args " + a);this.val = a},
				DESTRUCTOR: function (){cout("Derived DESTRUCTOR args " + this.val);},
				BaseClass: "BaseX, MidBaseA, MidBaseB",
				Variables: {val: -1},
			});
			;
			env.Function.ScopedCall(function(){
				let Derived = JEEP.GetClass("Derived");
				try{Derived.ScopedCreate(74)}
				catch(e){cout(e.message)}
			});
		}
	});

	testList.push({
		name: "calling virtual function from base constructor",
		desc: "Tests that virtual functions are invalid when called from constructor and destructor of a base class but valid everywhere else.",
		exp: [
			"Base.Print from Base CONSTRUCTOR", "Base.Print from Derived CONSTRUCTOR",
			"Derived.Print from CallPrint",
			"Base.Print from Derived DESTRUCTOR", "Base.Print from Base DESTRUCTOR",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){this.Print("Base CONSTRUCTOR");},
				DESTRUCTOR: function(){this.Print("Base DESTRUCTOR");},
				Functions: { 
					CallPrint: function(){this.Print("CallPrint")},
					$virtual$__Print: function(loc){cout("Base.Print from " + loc)},
				}
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){this.Print("Derived CONSTRUCTOR");},
				DESTRUCTOR: function(){this.Print("Derived DESTRUCTOR");},
				BaseClass: "Base",
				Functions: { $virtual$__Print: function(loc){cout("Derived.Print from " + loc)}}
			});
			env.Function.ScopedCall(function(){
				let d = JEEP.GetClass("Derived").ScopedCreate();
				d.CallPrint();
			});
		}
	});
	testList.push({
		name: "hier-siml-copyctor",
		desc: "Tests the copy constructor mechanism (single inheritance multiple level)",
		exp: [	
			"Base value: 10", "Derived value: 10",
			"Base value: 11", "Derived value: 11",
			"Base value: 10", "Derived value: 10",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(v){this.bval = v},
				Functions: {
					BChange: function(){this.bval++;},
					BPrint: function(){cout("Base value: "+this.bval)},
				},
				Variables: {bval: -1}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(v){this.val = v},
				BaseClass: "Base",
				Functions: {
					Change: function(){
						this.val++
						this.BChange()
					},
					Print: function(){
						this.BPrint()
						cout("Derived value: "+this.val)
					},
				},
				Variables: {val: -1}
			});
			let Derived = JEEP.GetClass("Derived");
			let d = new Derived(10);
			let d2 = new Derived(d);
			d.Print();
			d.Change();
			d.Print();
			d2.Print();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-virt-top-der-nomid",
		desc: "A function is declared virtual in top base and derived but not in mid base (single inheritance multiple level)",
		exp: ["Derived.__SomeVirtualFunction"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("TopBase.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
				Functions: {Dummy(){;}}// to avoid useless class error in production mode
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "MidBase",
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("Derived.__SomeVirtualFunction")}},
			});
			TestEnvInfo.simpleTester("Derived", ["SomeVirtualFunction"]);
		}
	});
	
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-virt-topbase-diamond",
		desc: "A virtual function exists in top base only (diamond multiple inheritance)",
		exp: ["TopBase.SomeVirtualFunction"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("TopBase.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseA", {
				BaseClass: "TopBase",
				Functions: {Dummy(){;}}// to avoid useless class error in production mode
			});
			env.Object.RegisterClass("BaseB", {
				BaseClass: "TopBase",
				Functions: {Dummy2(){;}}// to avoid useless class error in production mode
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {Dummy3(){;}}// to avoid useless class error in production mode
			});
			TestEnvInfo.simpleTester("Derived", ["SomeVirtualFunction"]);
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-virt-all-diamond",
		desc: "A virtual function exists in every class, the derived resolving ambiguity (diamond multiple inheritance)",
		exp: ["Derived.SomeVirtualFunction"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("TopBase.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseA", {
				BaseClass: "TopBase",
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("BaseA.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseB", {
				BaseClass: "TopBase",
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("BaseB.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("Derived.SomeVirtualFunction")}},
			});
			TestEnvInfo.simpleTester("Derived", ["SomeVirtualFunction"]);
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-virt-reabs-diamond",
		desc: "A virtual function present in every class is reabstracted in the immediate base of the derived causing no ambiguity (diamond multiple inheritance)",
		exp: ["Derived.SomeVirtualFunction"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("TopBase.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseA", {
				BaseClass: "TopBase",
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("BaseA.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("BaseB", {
				BaseClass: "TopBase",
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("BaseB.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("PreDerived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {$abstract$__SomeVirtualFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "PreDerived",
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("Derived.SomeVirtualFunction")}},
			});
			TestEnvInfo.simpleTester("Derived", ["SomeVirtualFunction"]);
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-virt-topbase-diamond-double",
		desc: "A virtual function exists in top base only (double diamond multiple inheritance)",
		exp: ["TopBase.SomeVirtualFunction"],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {$virtual$__SomeVirtualFunction: function(){cout("TopBase.SomeVirtualFunction")}},
			});
			env.Object.RegisterClass("MidBaseA", {
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("MidBaseB", {
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("MidBaseC", {
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("LowBaseA", {
				CONSTRUCTOR: function(){},
				BaseClass: "MidBaseA, MidBaseB",
			});
			env.Object.RegisterClass("LowBaseB", {
				CONSTRUCTOR: function(){},
				BaseClass: "MidBaseB, MidBaseC",
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "LowBaseA, LowBaseB",
			});
			TestEnvInfo.simpleTester("Derived", ["SomeVirtualFunction"]);
		}
	});
}

TestEnvInfo.failtest_Hierarchy = function(env, testList)
{
	testList.push({
		name: "class not implementing abstract function instantiated (single inheritance)",
		desc: "",
		exp: [
		"JEEP run time error [class Class]. Instantiation failed due to unimplemented abstract functions.",
		"The abstract function 'GetName' declared in base [Base] is not implemented.",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {$abstract$__GetName: function(){}},
			});
			env.Object.RegisterClass("Class", {
				BaseClass: "Base",
				CONSTRUCTOR: function(){},
			});
			let Class = JEEP.GetClass("Class");
			let c = new Class;
		}
	});

	testList.push({
		name: "class not implementing abstract function instantiated (diamond)",
		desc: "",
		exp: [
		"JEEP run time error [class Class]. Instantiation failed due to unimplemented abstract functions.",
		"The abstract function 'GetName' declared in base [Base] is not implemented.",
		"The abstract function 'GetNameA' declared in base [BaseA] is not implemented.",
		"The abstract function 'GetNameB' declared in base [BaseB] is not implemented.",
		"The abstract function 'GetNameC' is not implemented.",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {$abstract$__GetName: function(){}},
			});
			env.Object.RegisterClass("BaseA", {
				BaseClass: "Base",
				CONSTRUCTOR: function(){},
				Functions: {$abstract$__GetNameA: function(){}},
			});
			env.Object.RegisterClass("BaseB", {
				BaseClass: "Base",
				CONSTRUCTOR: function(){},
				Functions: {$abstract$__GetNameB: function(){}},
			});
			env.Object.RegisterClass("Class", {
				BaseClass: "BaseA, BaseB",
				CONSTRUCTOR: function(){},
				Functions: {$abstract$__GetNameC: function(){}},
			});
			let Class = JEEP.GetClass("Class");
			let c = new Class;
		}
	});

	if(env.IsDevMode())
	{
	testList.push({
	//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "reinforcing non virtual as abstract function",
		desc: "",
		exp: [
		"JEEP couldn't generate the class [MidBase] due to the following errors.",
		"The function 'getName' is declared 'abstract' in derived class [MidBase] but not in base class [TopBase].",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
					Functions: {
						TopBaseWork: function(){cout("TopBaseWork: "+this.getName())},
						getName: function(){return "<name from top base>"},
				}
			});
			env.Object.RegisterClass("MidBase", {
					BaseClass: "TopBase",
					Functions: {
						$abstract$__getName: function(){},
				}
			});
			env.Object.RegisterClass("Derived", {
					BaseClass: "MidBase",
					Functions: {
						$virtual$__getName: function(){return "<name from derived>"},
				}
			});
		}
	});

	testList.push({
	//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "reinforcing implemented virtual as abstract function argument count mismatch",
		desc: "",
		exp: [
		"JEEP couldn't generate the class [MidBase] due to the following errors.",
		"The argument count for the virtual function 'getName' is declared as 0 in base class [TopBase] but as 1 in derived class [MidBase].",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
					Functions: {
						TopBaseWork: function(){cout("TopBaseWork: "+this.getName())},
						$virtual$__getName: function(){return "<name from top base>"},
				}
			});
			env.Object.RegisterClass("MidBase", {
					BaseClass: "TopBase",
					Functions: {
						$abstract$__getName: function(how){},
				}
			});
			env.Object.RegisterClass("Derived", {
					BaseClass: "MidBase",
					Functions: {
						$virtual$__getName: function(){return "<name from derived>"},
				}
			});
		}
	});

	testList.push({
	//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "reinforcing existing abstract function argument count mismatch",
		desc: "",
		exp: [
		"JEEP couldn't generate the class [MidBase] due to the following errors.",
		"The argument count for the abstract function 'getName' is declared as 0 in base class [TopBase] but as 1 in derived class [MidBase].",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
					Functions: {
						TopBaseWork: function(){cout("TopBaseWork: "+this.getName())},
						$abstract$__getName: function(){},
				}
			});
			env.Object.RegisterClass("MidBase", {
					BaseClass: "TopBase",
					Functions: {
						$abstract$__getName: function(how){},
				}
			});
			env.Object.RegisterClass("Derived", {
					BaseClass: "MidBase",
					Functions: {
						$virtual$__getName: function(){return "<name from derived>"},
				}
			});
		}
	});

	testList.push({
		name: "base virtual derived virtual argument count mismatch",
		desc: "as the name indicates",
		exp: [
		"JEEP couldn't generate the class [Derived] due to the following errors.",
		"The argument count for the virtual function 'GetName' is declared as 1 in base class [Base] but as 2 in derived class [Derived].",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {$virtual$__GetName: function(a){}},
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {$virtual$__GetName: function(a, b){}},
			});
		}
	});

	testList.push({
		name: "base abstract derived virtual argument count mismatch",
		desc: "as the name indicates",
		exp: [
		"JEEP couldn't generate the class [Derived] due to the following errors.",
		"The argument count for the abstract function 'GetName' is declared as 1 in base class [Base] but as 2 in derived class [Derived].",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {$abstract$__GetName: function(a){}},
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {$virtual$__GetName: function(a, b){}},
			});
		}
	});
	}

	testList.push({
	//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "not implementing virtual function reinforced as abstract",
		desc: "",
		exp: [
		"JEEP run time error [class Derived]. Instantiation failed due to unimplemented abstract functions.",
		"The abstract function 'getName' declared in base [TopBase] and reinforced in base [MidBase] is not implemented.",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
					Functions: {
						TopBaseWork: function(){cout("TopBaseWork: "+this.getName())},
						$virtual$__getName: function(){return "<name from top base>"},
				}
			});
			env.Object.RegisterClass("MidBase", {
					BaseClass: "TopBase",
					Functions: {
						$abstract$__getName: function(){},
				}
			});
			env.Object.RegisterClass("Derived", {
					BaseClass: "MidBase",
					Functions: {
						$virtual$__ggetName: function(){return "<name from derived>"},
				}
			});
			Class = JEEP.GetClass("Derived");
			c = new Class;
		}
	});

	testList.push({
	//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "not implementing virtual function reinforced as abstract (disney mermaid)",
		desc: "",
		exp: [
		"JEEP run time error [class Derived]. Instantiation failed due to unimplemented abstract functions.",
		"The abstract function 'getName' declared in base [TopBase] and reinforced in base [MidBaseA] is not implemented.",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
					Functions: {
						$virtual$__getName: function(){return "<name from top base>"},
				}
			});
			env.Object.RegisterClass("MidBaseA", {
					BaseClass: "TopBase",
					Functions: {
						$abstract$__getName: function(){},
				}
			});
			env.Object.RegisterClass("MidBaseB", {
					BaseClass: "TopBase",
			});
			env.Object.RegisterClass("Derived", {
					BaseClass: "MidBaseA, MidBaseB",
			});
			Class = JEEP.GetClass("Derived");
			c = new Class;
		}
	});

	testList.push({
	//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "reinforcing implemented virtual function as abstract",
		desc: "",
		exp: [
		"TopBaseWork: <name from derived>",
		"JEEP run time error [class MidBase]. Instantiation failed due to unimplemented abstract functions.",
		"The abstract function 'getName' declared in base [TopBase] and reinforced in the class is not implemented.",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
					Functions: {
						TopBaseWork: function(){cout("TopBaseWork: "+this.getName())},
						$virtual$__getName: function(){return "<name from top base>"},
				}
			});
			env.Object.RegisterClass("MidBase", {
					BaseClass: "TopBase",
					Functions: {
						$abstract$__getName: function(){},
				}
			});
			env.Object.RegisterClass("Derived", {
					BaseClass: "MidBase",
					Functions: {
						$virtual$__getName: function(){return "<name from derived>"},
				}
			});
			Class = JEEP.GetClass("Derived");
			c = new Class;
			c.TopBaseWork();
			new(JEEP.GetClass("MidBase"));
		}
	});

	testList.push({
		name: "hier-siml-ctor-fail-top",
		desc: "The top base fails to construct by returnung false (single inheritance multiple level)",
		exp: ["The class 'Derived' failed to instantiate at base 'TopBase'."],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(){return false;},
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "MidBase",
			});
			try{TestEnvInfo.simpleTester("Derived")}catch(e){cout(e.message)}
		}
	});

	testList.push({
		name: "hier-siml-ctor-fail-mid",
		desc: "A mid base fails to construct by returnung false (single inheritance multiple level)",
		exp: ["The class 'Derived' failed to instantiate at base 'MidBase'."],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
				CONSTRUCTOR: function(){return false;},
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "MidBase",
			});
			try{TestEnvInfo.simpleTester("Derived")}catch(e){cout(e.message)}
		}
	});

	testList.push({
		name: "hier-siml-ctor-fail",
		desc: "A derived class construct fails by returnung false (single inheritance multiple level)",
		exp: ["The class 'Derived' failed to instantiate."],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "MidBase",
				CONSTRUCTOR: function(){return false;},
			});
			try{TestEnvInfo.simpleTester("Derived")}catch(e){cout(e.message)}
		}
	});

	testList.push({
		name: "hier-siml-part-dest-mid",
		desc: "Tests the partial destruction mechanism when mid base fails (single inheritance multiple level)",
		exp: [	
			"TopBase.DESTRUCTOR",
			"The class 'Derived' failed to instantiate at base 'MidBase'.",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				DESTRUCTOR: function (){cout("TopBase.DESTRUCTOR");},
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
				CONSTRUCTOR: function(){return false;},
				DESTRUCTOR: function (){cout("MidBase.DESTRUCTOR");},
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "MidBase",
				DESTRUCTOR: function (){cout("Derived.DESTRUCTOR");},
			});
			try{TestEnvInfo.simpleTester("Derived")}catch(e){cout(e.message)}
		}
	});

	testList.push({
		name: "hier-siml-part-dest-top",
		desc: "Tests the partial destruction mechanism when top base fails (single inheritance multiple level)",
		exp: ["The class 'Derived' failed to instantiate at base 'TopBase'."],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(){return false;},
				DESTRUCTOR: function (){cout("TopBase.DESTRUCTOR");},
			});
			env.Object.RegisterClass("MidBase", {
				BaseClass: "TopBase",
				DESTRUCTOR: function (){cout("MidBase.DESTRUCTOR");},
			});
			env.Object.RegisterClass("Derived", {
				BaseClass: "MidBase",
				DESTRUCTOR: function (){cout("Derived.DESTRUCTOR");},
			});
			try{TestEnvInfo.simpleTester("Derived")}catch(e){cout(e.message)}
		}
	});

	if(env.IsDevMode())
	{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-sisl-virt-mismatch-nobase-der",
		desc: "A function is declared virtual in derived but not in base (single inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The function 'SomeFunction' is declared 'virtual' in derived class [Derived] but not in base class [Base].",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){cout("if this prints the test failed")},
				Functions: {SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {$virtual$__SomeFunction: function(){}},
			});
		}
	});
	
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-sisl-virt-mismatch-base-noder",
		desc: "A function is declared virtual in base but not in derived (single inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The function 'SomeFunction' is declared 'virtual' in base class [Base] but not in derived class [Derived].",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){cout("if this prints the test failed")},
				Functions: {$virtual$_SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {SomeFunction: function(){}},
			});
		}
	});
	
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-rep-mixvirt",
		desc: "A function repeats in bases and is declared virtual in some (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The function 'SomeFunction' is declared virtual in some bases [BaseA] but not in some bases [BaseB]."
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				Functions: {$virtual$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("BaseB", {
				Functions: {SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {SomeFunction: function(){}},
			});
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-rep-virt",
		desc: "A virtual function repeats in multiple lines of bases (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The virtual function 'SomeFunction' is declared multiple times in the hierarchy [BaseA, BaseB].",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				Functions: {$virtual$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("BaseB", {
				Functions: {$virtual$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
			});
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-rep-abs",
		desc: "An abstract function repeats in multiple lines of bases (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The virtual function 'SomeFunction' is declared multiple times in the hierarchy [BaseA, BaseB].",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				Functions: {$abstract$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("BaseB", {
				Functions: {$abstract$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
			});
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-rep-abs-virt",
		desc: "An abstract and virtual function have same name in multiple lines of bases (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The virtual function 'SomeFunction' is declared multiple times in the hierarchy [BaseA, BaseB].",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				Functions: {$virtual$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("BaseB", {
				Functions: {$abstract$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
			});
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-rep-virt-diamond",
		desc: "A virtual function repeats in multiple bases of same line (diamond multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The virtual function 'SomeFunction' is ambiguous as it is present in multiple base classes [BaseA, BaseB].",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {$virtual$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("BaseA", {
				BaseClass: "TopBase",
				Functions: {$virtual$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("BaseB", {
				BaseClass: "TopBase",
				Functions: {$virtual$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
			});
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-rep-virt-diamond-2",
		desc: "A virtual function is implemented in topbase, overridden in one midbase, other midbase inherit (diamond multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The virtual function 'SomeFunction' is ambiguous as it is present in multiple base classes [TopBase, BaseB].",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				Functions: {$virtual$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("BaseA", {
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("BaseB", {
				BaseClass: "TopBase",
				Functions: {$virtual$__SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
			});
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-siml-func-rep",
		desc: "A non virtual function repeats in base and defived classes (single inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The function 'SomeFunction' is declared multiple times in the hierarchy [Base, Derived].",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				Functions: {SomeFunction: function(){}},
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Functions: {SomeFunction: function(){}},
			});
		}
	});
	
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-rep",
		desc: "A non virtual function repeats in some bases (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The function 'SomeFunction' is declared multiple times in the hierarchy [BaseA, BaseB].",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				Functions: {SomeFunction: function(){}},
			});
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				Functions: {SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
			});
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "hier-misl-func-rep-der",
		desc: "A non virtual function repeats in some bases and derived (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The function 'SomeFunction' is declared multiple times in the hierarchy [BaseA, BaseB, Derived].",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				Functions: {SomeFunction: function(){}},
			});
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				Functions: {SomeFunction: function(){}},
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
				Functions: {SomeFunction: function(){}},
			});
		}
	});

	testList.push({
		name: "hier-siml-var-rep",
		desc: "A variable repeats in some bases (single inheritance multiple level)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The variable 'SomeVariable' is declared multiple times in the hierarchy [Derived, Base].",
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Variables: {$get$__SomeVariable: 0}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "Base",
				Variables: {SomeVariable: 0}
			});
		}
	});
	
	testList.push({
		name: "hier-misl-var-rep-base",
		desc: "A variable repeats in some bases (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The variable 'SomeVariable' is declared multiple times in the hierarchy [BaseA, BaseB].",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){},
				Variables: {SomeVariable: 0}
			});
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				Variables: {$get$__SomeVariable: 0}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
			});
		}
	});

	testList.push({
		name: "hier-misl-var-rep-ancestor",
		desc: "A variable repeats in some bases (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The variable 'SomeVariable' is declared multiple times in the hierarchy [BaseX, BaseB].",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(){},
				Variables: {SomeVariable: 0}
			});
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseX",
			});
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){},
				Variables: {SomeVariable: 0}
			});
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){},
				BaseClass: "BaseA, BaseB",
			});
		}
	});
	
	testList.push({
		name: "hier-base-base-base",
		desc: "A base is the immediate base of other bases (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The base class 'BaseX' is the base of another base class 'BaseA'.",
			"The base class 'BaseX' is the base of another base class 'BaseB'.",
		],
		func: function(cout){
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(){cout("BaseX constructor")},
			});
			;
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){cout("BaseA constructor")},
				BaseClass: "BaseX",
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){cout("BaseB constructor")},
				BaseClass: "BaseX",
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){cout("Derived constructor")},
				BaseClass: "BaseX, BaseA, BaseB",
			});
		}
	});
	
	testList.push({
		name: "hier-base-base-ancestor",
		desc: "A base is the remote base of other bases (multiple inheritance)",
		exp: [	
			"JEEP couldn't generate the class [Derived] due to the following errors.",
			"The base class 'TopBase' is the base of another base class 'BaseA'.",
			"The base class 'TopBase' is the base of another base class 'BaseB'.",
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(){cout("BaseX constructor")},
			});
			;
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(){cout("BaseA constructor")},
				BaseClass: "TopBase",
			});
			env.Object.RegisterClass("BaseA", {
				CONSTRUCTOR: function(){cout("BaseA constructor")},
				BaseClass: "BaseX",
			});
			;
			env.Object.RegisterClass("BaseB", {
				CONSTRUCTOR: function(){cout("BaseB constructor")},
				BaseClass: "BaseX",
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(){cout("Derived constructor")},
				BaseClass: "TopBase, BaseA, BaseB",
			});
		}
	});
	
	testList.push({
		name: "hier-manual-base",
		desc: "A class uses manual-base-construction flag without having bases",
		exp: [	
			"JEEP couldn't generate the class [Class] due to the following errors.",
			"The flag 'manual-base-construction' can be used only when a class has base classes.",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "manual-base-construction",
				BaseClass: "",
				CONSTRUCTOR: function(){},
			});
		}
	});
	}

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "virtual function with scoped multiple instances",
		desc: "Tests that polymorphism is enabled and disabled in constructor and destructor for all instances with scoped mechanism.",
		exp: ["Base.Print CONSTRUCTOR", "Base.Print CONSTRUCTOR","Base.Print DESTRUCTOR", "Base.Print DESTRUCTOR",],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){this.Print("CONSTRUCTOR")},
				Functions: {
					$virtual$__Print: function(from){cout("Base.Print " + from)},
				},
			});
			env.Object.RegisterClass("Class", {
				BaseClass: "Base",
				CONSTRUCTOR: function(){},
				DESTRUCTOR: function(){this.Print("DESTRUCTOR")},
				Functions: {
					$virtual$__Print: function(from){cout("Class.Print " + from)},
				},
			});
			let A = JEEP.GetClass("Class");
			env.Function.ScopedCall(function(){
				A.ScopedCreate();
				A.ScopedCreate();
			})
		}
	});
}

TestEnvInfo.passtest_Scoped = function(env, testList)
{
	testList.push({
		name: "scoped non member function (with MakeScoped)",
		desc: "Tests the setup and working of a function using the MakeScoped API.",
		exp: [
			"Class CONSTRUCTOR instantiated with 10", "Class member value = 10", 
			"Class CONSTRUCTOR instantiated with 77", "Class CONSTRUCTOR instantiated with 33", 
			"Class CONSTRUCTOR instantiated with 100", 
			"Class destroyed with val 33", "Class destroyed with val 77", "Class destroyed with val 10",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(a){cout("Class CONSTRUCTOR instantiated with " + a);this.val=a;},
				DESTRUCTOR: function(){cout("Class destroyed with val "+this.val);},
				Functions: {Print: function(){cout(this.$name+" member value = "+this.val)}},
				Variables: {val: 49}
			});
			;
			let func = env.Function.MakeScoped(function(){
				let Class = JEEP.GetClass("Class");
				let c = Class.ScopedCreate(10);
				c.Print();
				Class.ScopedCreate(77);
				Class.ScopedCreate(33);
				c = new Class(100);// won't be scoped
			});
			func();
		}
	});

	testList.push({
		name: "scoped non member function (with ScopedCall)",
		desc: "Tests the setup and working of a function using the ScopedCall API.",
		exp: [
			"scoped call function arg: -333",
			"Class CONSTRUCTOR instantiated with 10", "Class member value = 10", 
			"Class CONSTRUCTOR instantiated with 77", "Class CONSTRUCTOR instantiated with 33", 
			"Class CONSTRUCTOR instantiated with 100", 
			"Class destroyed with val 33", "Class destroyed with val 77", "Class destroyed with val 10",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(a){cout("Class CONSTRUCTOR instantiated with " + a);this.val=a;},
				DESTRUCTOR: function(){cout("Class destroyed with val "+this.val);},
				Functions: {Print: function(){cout(this.$name+" member value = "+this.val)}},
				Variables: {val: 49}
			});
			;
			env.Function.ScopedCall(function(a){
				cout("scoped call function arg: " + a);
				let Class = JEEP.GetClass("Class");
				let c = Class.ScopedCreate(10);
				c.Print();
				Class.ScopedCreate(77);
				Class.ScopedCreate(33);
				c = new Class(100);// won't be scoped
			}, -333);
		}
	});

	testList.push({
		name: "scoped member function",
		desc: "Tests the setup and working of a scoped member function.",
		exp: [
			"Class CONSTRUCTOR instantiated with 123", 
			"scoped function arg: -444",
			"Class member value = 123", 
			"Class CONSTRUCTOR instantiated with 10", "Class CONSTRUCTOR instantiated with 77", "Class CONSTRUCTOR instantiated with 33",
			"Class CONSTRUCTOR instantiated with 100", 
			"Class destroyed with val 33", "Class destroyed with val 77", "Class destroyed with val 10",
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(a){cout("Class CONSTRUCTOR instantiated with " + a);this.val=a;},
				DESTRUCTOR: function(){cout("Class destroyed with val "+this.val);},
				Functions: {
					$scoped$__Test: function(a){
						cout("scoped function arg: " + a);
						cout(this.$name+" member value = "+this.val)
						Class.ScopedCreate(10);
						Class.ScopedCreate(77);
						Class.ScopedCreate(33);
						new Class(100);// won't be scoped
					}
				},
				Variables: {val: 49}
			});
			let Class = JEEP.GetClass("Class");
			c = new Class(123);
			c.Test(-444);
		}
	});

	testList.push({
		name: "ScopedCreate outside nested scoped function",
		desc: "",
		exp: ["CONSTRUCTOR 9", "DESTRUCTOR 9", "CONSTRUCTOR 33", "DESTRUCTOR 33"],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(v){cout("CONSTRUCTOR "+v);this.value=v},
				DESTRUCTOR: function(){cout("DESTRUCTOR "+this.value)},
				Variables: {value: -1},
			});
			env.Function.ScopedCall(function(){
				env.Function.ScopedCall(function(){
					let c = JEEP.GetClass("Class").ScopedCreate(9);
				});
				let c = JEEP.GetClass("Class").ScopedCreate(33);
			});
		}
	});

	testList.push({
		name: "scoped non member function that throws",
		desc: "Tests that the objects are destroyed properly when a scoped non member function throws an exception.",
		exp: ["Class CONSTRUCTOR instantiated with 10", "Class destroyed with val 10"],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(a){cout("Class CONSTRUCTOR instantiated with " + a);this.val=a;},
				DESTRUCTOR: function(){cout("Class destroyed with val "+this.val);},
				Variables: {val: 49}
			});
			;
			env.Function.ScopedCall(function(){
				let Class = JEEP.GetClass("Class");
				Class.ScopedCreate(10);
				throw "throwing from a scoped function";
			});
		}
	});

	testList.push({
		name: "scoped member function that throws",
		desc: "Tests that the objects are destroyed properly when a scoped member function throws an exception.",
		exp: ["Class CONSTRUCTOR instantiated with 63", "Class CONSTRUCTOR instantiated with 10", "Class destroyed with val 10"],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(a){cout("Class CONSTRUCTOR instantiated with " + a);this.val=a;},
				DESTRUCTOR: function(){cout("Class destroyed with val "+this.val);},
				Functions: {$scoped$__Test: function(){this.$def.ScopedCreate(10);throw "throwing from a scoped function";}},
				Variables: {val: 49}
			});
			let Class = JEEP.GetClass("Class");
			let c = new Class(63);
			c.Test();
		}
	});

	testList.push({
		name: "scoped function call with single inheritance",
		desc: "Tests the order of constructor and destructor calls inside a scoped function for multiple instances of a singly inherited class.",
		exp: [
			"Base CONSTRUCTOR args 74", "Derived CONSTRUCTOR args 74", "Base CONSTRUCTOR args 98", "Derived CONSTRUCTOR args 98",
			"Derived DESTRUCTOR args 98", "Base DESTRUCTOR args 98","Derived DESTRUCTOR args 74", "Base DESTRUCTOR args 74", 
		],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(a){cout("Base CONSTRUCTOR args " + a);this.bval = a},
				DESTRUCTOR: function (){cout("Base DESTRUCTOR args " + this.bval);},
				Variables: {bval: -1},
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(a){cout("Derived CONSTRUCTOR args " + a);this.val = a},
				DESTRUCTOR: function (){cout("Derived DESTRUCTOR args " + this.val);},
				BaseClass: "Base",
				Variables: {val: -1},
			});
			;
			env.Function.ScopedCall(function(){
				let Derived = JEEP.GetClass("Derived");
				Derived.ScopedCreate(74);
				Derived.ScopedCreate(98);
			});
		}
	});

	testList.push({
		name: "scoped function call with diamond and shaft multiple inheritance",
		desc: "Tests the order of constructor and destructor calls inside a scoped function for multiple instances of a complex multiple inheritance.",
		exp: [
			"BaseX CONSTRUCTOR args 74", "TopBase CONSTRUCTOR args 74", "MidBaseA CONSTRUCTOR args 74", "MidBaseB CONSTRUCTOR args 74","Derived CONSTRUCTOR args 74", 
			"BaseX CONSTRUCTOR args 98", "TopBase CONSTRUCTOR args 98", "MidBaseA CONSTRUCTOR args 98", "MidBaseB CONSTRUCTOR args 98","Derived CONSTRUCTOR args 98", 
			"Derived DESTRUCTOR args 98","MidBaseB DESTRUCTOR args 98", "MidBaseA DESTRUCTOR args 98", "TopBase DESTRUCTOR args 98", "BaseX DESTRUCTOR args 98", 
			"Derived DESTRUCTOR args 74","MidBaseB DESTRUCTOR args 74", "MidBaseA DESTRUCTOR args 74", "TopBase DESTRUCTOR args 74", "BaseX DESTRUCTOR args 74", 
		],
		func: function(cout){
			env.Object.RegisterClass("TopBase", {
				CONSTRUCTOR: function(a){cout("TopBase CONSTRUCTOR args " + a);this.baval = a},
				DESTRUCTOR: function (){cout("TopBase DESTRUCTOR args " + this.baval);},
				Variables: {baval: -1},
			});
			;
			env.Object.RegisterClass("MidBaseA", {
				CONSTRUCTOR: function(a){cout("MidBaseA CONSTRUCTOR args " + a);this.bbval = a},
				DESTRUCTOR: function (){cout("MidBaseA DESTRUCTOR args " + this.bbval);},
				BaseClass: "TopBase",
				Variables: {bbval: -1},
			});
			;
			env.Object.RegisterClass("MidBaseB", {
				CONSTRUCTOR: function(a){cout("MidBaseB CONSTRUCTOR args " + a);this.bcval = a},
				DESTRUCTOR: function (){cout("MidBaseB DESTRUCTOR args " + this.bcval);},
				BaseClass: "TopBase",
				Variables: {bcval: -1},
			});
			;
			env.Object.RegisterClass("BaseX", {
				CONSTRUCTOR: function(a){cout("BaseX CONSTRUCTOR args " + a);this.bxval = a},
				DESTRUCTOR: function (){cout("BaseX DESTRUCTOR args " + this.bxval);},
				Variables: {bxval: -1},
			});
			;
			env.Object.RegisterClass("Derived", {
				CONSTRUCTOR: function(a){cout("Derived CONSTRUCTOR args " + a);this.val = a},
				DESTRUCTOR: function (){cout("Derived DESTRUCTOR args " + this.val);},
				BaseClass: "BaseX, MidBaseA, MidBaseB",
				Variables: {val: -1},
			});
			;
			env.Function.ScopedCall(function(){
				let Derived = JEEP.GetClass("Derived");
				Derived.ScopedCreate(74);
				Derived.ScopedCreate(98);
			});
		}
	});
}

TestEnvInfo.failtest_Scoped = function(env, testList)
{
	if(env.IsDevMode())
	{
		testList.push({
			name: "ScopedCreate outside scoped function",
			desc: "",
			exp: [
			"JEEP run time error [class Class]. ScopedCreate can only be used inside a scoped function.",
			],
			func: function(cout){
				env.Object.RegisterClass("Class", {
					CONSTRUCTOR: function(){},
					DESTRUCTOR: function(){},
					Functions: {GetName: function(){;}},
				});
				let c = JEEP.GetClass("Class").ScopedCreate();
			}
		});
	}
}

TestEnvInfo.failtest_ProductionMode = function(givenEnv, testList)
{
	if(givenEnv.IsDevMode())
		return;

	// These are the tests that have wrong syntax or invalid runtime behavior but the flags make these
	// passable and thus the generated class fail silently.

	let env = JEEP.CreateEnvironment({mode: "production-mode", client: "jeep-aware"});

	testList.push({
		name: "prod-decl-nodef",
		desc: "Tests that production mode doesn't validate duplicate declare define method",
		exp: ["Class member value = 7"],
		func: function(cout){
			env.Object.DeclareClass("Class", {
				CONSTRUCTOR: function(){}, 
				Functions: {Print: function () {}, Another: function(){}}
			});
			env.Object.DefineClass("Class", {
				CONSTRUCTOR: function(){}, 
				Functions: {Print: function(){cout(this.$name+" member value = "+this.val)}},
				Variables: {val: 7}
			});
			let Class = JEEP.GetClass("Class"); 
			let c = new Class;
			c.Print();
		}
	});

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prod-invalid-directives",
		desc: "Tests that production mode doesn't validate directive names",
		exp: ["printed from junk directive function"],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					$junk$__Test: function(){cout("printed from junk directive function")},
				},
				Variables: {value: 10},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			c.Test();
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prod-dup-func-var",
		desc: "Tests that production mode doesn't validate duplicate names",
		exp: ["printed from derived junk directive function -99"],
		func: function(cout){
			env.Object.RegisterClass("Base", {
				CONSTRUCTOR: function(){},
				Functions: {
					$junk$__Test: function(){cout("printed from base junk directive function " + this.value)},
				},
				Variables: {value: 10},
			});	
			env.Object.RegisterClass("Class", {
				BaseClass: "Base",
				CONSTRUCTOR: function(){},
				Functions: {
					$junk$__Test: function(){cout("printed from derived junk directive function " + this.value)},
				},
				Variables: {value: -99},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			c.Test();
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prod-const-func",
		desc: "Tests constant member function mechanism is not enforced in production mode without the associated retain flag.",
		exp: [
		"value: 10",  
		"value: 0", 
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				CONSTRUCTOR: function(){},
				Functions: {
					$const$__Test: function(){this.Print();this.Modify();this.Print();},
					Modify: function(){this.value = 0;},
					Print: function(){cout("value: " + this.value);}
				},
				Variables: {value: 10},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			c.Test();
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prod-internal-variable-change",
		desc: "Tests that the eponymous flag is not enforced in production mode without the associated retain flag.",
		exp: [
		"value: 10",  
		"value: 8", 
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				Functions: {
					Print: function(){cout("value: " + this.value);}
				},
				Variables: {value: 10},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			c.Print();
			c.value = 8;
			c.Print();
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "prod-argcount",
		desc: "Tests that argument count is not enforced in production mode without the associated retain flag.",
		exp: [
		"undefinedinundefined",
		"1in2"
		],
		func: function(cout){
			env.Object.RegisterClass("Class", {
				Flags: "internal-variable-change",
				CONSTRUCTOR: function(){},
				Functions: {
					$argnum$__Print: function(what, where){cout(what + "in" + where);}
				},
			});	
			let Class =	JEEP.GetClass("Class");
			let c = new Class;
			try{c.Print()}catch(e){}
			try{c.Print(1,2,3)}catch(e){}
		}
	});		
}

TestEnvInfo.passtest_Library = function(env, testList)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "lib-basic",
		desc: "Tests the library setup.",
		aspects: "library",
		exp: [
		"lib init count: 1", "arg: 10",
		"init returned: 1",
		"lib init count: 2","arg: 20",
		"init returned: 2",
		],
		func: function(cout){
			function init(val){
				cout(this.$name + " init count: "+(++this.count));
				cout("arg: "+val);
				return this.count;
			}
			JEEP.RegisterLibrary("lib", init, {count: 0})
			let c = JEEP.InitLibrary("lib", 10);
			cout("init returned: "+c);
			c = JEEP.InitLibrary("lib", 20);
			cout("init returned: "+c);
		}
	});		

	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "lib-managed-init",
		desc: "Tests the library setup where JEEP manages the init return.",
		aspects: "library",
		exp: [
		"init lib...",
		"init returned: lib-result",
		"init returned: lib-result",
		],
		func: function(cout){
			JEEP.RegisterLibrary("lib", function(){
				cout("init lib...")
				return "lib-result"
			})
			let c = JEEP.InitLibrary("lib", 10);
			cout("init returned: "+c);
			c = JEEP.InitLibrary("lib", 20);
			cout("init returned: "+c);
		}
	});		
}

TestEnvInfo.failtest_Library = function(env, testList)
{
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "lib-reg-args",
		desc: "Tries to register library with wrong arguments.",
		aspects: "library, apiargs",
		exp: [
		"JEEP aborting from RegisterLibrary. The function expects a valid string, a valid function and an optional object as arguments.",
		"JEEP aborting from RegisterLibrary. The function expects a valid string, a valid function and an optional object as arguments.",
		"JEEP aborting from RegisterLibrary. The function expects a valid string, a valid function and an optional object as arguments.",
		"JEEP aborting from RegisterLibrary. Cannot register a non function for the library 'a'.",
		"JEEP aborting from RegisterLibrary. The parameter for the library 'a' contains the reserved word '$name'.",
		],
		func: function(cout){
			try{JEEP.RegisterLibrary("a")}catch(e){}
			try{JEEP.RegisterLibrary("a", function(){}, 0,0)}catch(e){}
			try{JEEP.RegisterLibrary(1)}catch(e){}
			try{JEEP.RegisterLibrary("a", 1, 1)}catch(e){}
			try{JEEP.RegisterLibrary("a", function(){}, {$name: 0})}catch(e){}
		}
	});		
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "lib-reg",
		desc: "Tries to register a library more than once.",
		aspects: "library",
		exp: [
		"JEEP aborting from RegisterLibrary. A library by the name 'lib' is already registered."
		],
		func: function(cout){
			function init(){
				cout("init count: "+(++this.count));
				return this.count;
			}
			JEEP.RegisterLibrary("lib", init, {count: 0})
			JEEP.RegisterLibrary("lib", init, {count: 0})
		}
	});		
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "lib-init-args",
		desc: "Tries to initiate library with invalid args.",
		aspects: "library, apiargs",
		exp: [
		"JEEP aborting from InitLibrary. The function expects exactly one argument which must be a valid string.",
		"JEEP aborting from InitLibrary. The function expects exactly one argument which must be a valid string.",
		],
		func: function(cout){
			try{JEEP.InitLibrary()}catch(e){}
			try{JEEP.InitLibrary(1)}catch(e){}
		}
	});		
	testList.push({
		//focusThis: TestEnvInfo.SPECIAL_FOCUS_ON,
		name: "lib-absent",
		desc: "Tries to initiate a non registered library.",
		aspects: "library",
		exp: [
		"JEEP aborting from InitLibrary. The library by the name 'lib' is not registered.",
		],
		func: function(cout){
			try{JEEP.InitLibrary("lib")}catch(e){}
		}
	});		
}