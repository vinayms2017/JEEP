
// demo infrastructure setup

let DemoEnv = JEEP.CreateEnvironment({client: "jeep-aware", mode: "development-mode"});

let Run = DemoEnv.Function.MakeScoped(function(demo){
	let printer = JEEP.GetClass("DemoPrinter").ScopedCreate();
	let cout = printer.Print.bind(printer);
	JEEP.SetStdErr(cout);
	demo(cout, function(title){
		printer.AddTitle(title);
	});
})

DemoEnv.Object.RegisterClass("DemoPrinter", {
	DESTRUCTOR: function(){
		let div = document.createElement("div");
		div.style.whiteSpace = "pre-wrap";
		div.style.margin = "1em";
		div.style.fontFamily = "courier";
		div.style.fontSize = "16px";
		div.textContent = this.text;
		if(this.title)
		{
			let p = document.createElement("p");
			p.textContent = this.title;
			p.style.fontWeight = "bold";
			div.insertBefore(p, div.firstChild)
		}
		document.body.append(div);
	},
	Functions: {
		Print: function(what){
			this.text += what + "\n";
		},
		AddTitle: function(title){
			this.title = title;
		}
	},
	Variables: {
		text: "",
		title: "",
	}
});

// demo code

Run(function(cout, setTitle){
	setTitle("Record Demo");	

	function withoutRecord(){
		let actions = [];

		function event1(){
			//...
			actions.push({src: "c:\\myfile1", dest: "d:\\myfile1", flag: Flags.F_COPY})
		}
		function event2(){
			//...
			actions.push({src: "c:\\myfile2", dest: "d:\\myfile2", flag: Flags.F_COPYERASE})
		}
		function event3(){
			//...
			actions.push({src: "c:\\myfile3", dest: "d:\\myfile3", flag: Flags.F_RAIDCOPY})
		}
	}

	let Flags = {F_COPY: 1, F_COPYERASE: 2, F_RAIDCOPY: 4}

	DemoEnv.Object.RegisterRecord("FileTransferInfo", {
		src: "",
		dest: "[home]",
		flags: Flags.F_COPY,
	})
	
	let actions = [];

	function withRecord(){

		function event1(){
			//...
			let FTI = JEEP.GetRecord("FileTransferInfo");	
			actions.push(FTI.New({
				src: "c:\\afile", 
				dest: "d:\\file_a", 
				flags: Flags.F_COPYERASE
			}))
		}
		function event2(){
			//...
			let FTI = JEEP.GetRecord("FileTransferInfo");	
			actions.push(FTI.New({
				src: "d:\\file_x", 
				flags: Flags.F_RAIDCOPY
			}))
		}
		function event3(){
			//...
			let FTI = JEEP.GetRecord("FileTransferInfo");	
			actions.push(FTI.New({src: "[office]file_x"}));
		}
		event1(); event2();event3();
	}
	
	withRecord();

	for(let k = 0; k<actions.length; k++)
	{
		let i = actions[k];
		cout("copying from '"+i.src+"'' to '"+i.dest+"' with flags '"+i.flags+ "'...")
	}

	let FTI = JEEP.GetRecord("FileTransferInfo");
	let fi = actions[0];
	cout("FileTransferInfo.InstanceOf(fi)? "+(FTI.InstanceOf(fi)?"yes":"no"))
	cout("FileTransferInfo.InstanceOf({})? "+(FTI.InstanceOf({})?"yes":"no"))
	cout("> cloning")
	let ficlone = fi.Clone()
	let cloningSucceeded = FTI.InstanceOf(ficlone) && fi.Equal(ficlone);
	cout("cloning "+(cloningSucceeded?"succeeded":"failed"))
	cout("fi.Equal(ficlone)? "+(fi.Equal(ficlone)?"yes":"no"))
	cout("fi.Equal()? "+(fi.Equal()?"yes":"no"))
	cout("fi.Equal(null)? "+(fi.Equal(null)?"yes":"no"))
	cout("fi.Equal({})? "+(fi.Equal({})?"yes":"no"))
	cout("> using fi.Change({flags: Flags.F_RAIDCOPY})")
	fi.Change({flags: Flags.F_RAIDCOPY})
	cout("fi.Equal(ficlone)? "+(fi.Equal(ficlone)?"yes":"no"))
	cout("> instantiating with invalid variable")
	try{FTI.New({type: Flags.F_RAIDCOPY})}catch(e){cout(e.message)}
})

Run(function(cout, addTitle){	
	addTitle("Struct demo");	

	DemoEnv.Object.RegisterStruct("Vector", {
		CONSTRUCTOR: function(rawArr){
			this.arr = Array.from(rawArr);
		},

		Variables: {arr: []},

		Functions: {
			Print: function(){cout(this.$name +": "+ this.arr.join())},

			Size: function(){return this.arr.length},

			ApplyOperator: function(op, vec){
				if(vec && !this.$def.InstanceOf(vec))
					throw new Error("Vector.ApplyOperator expects a Vector.")
				vec = vec || this;
				let res = [];
				for(let k = 0; k<vec.Size(); k++)
				{
					switch(op)
					{
						case '+': res[k] = vec.arr[k] + this.arr[k]; break;
						case '-': res[k] = vec.arr[k] - this.arr[k]; break;
						case '*': res[k] = vec.arr[k] * this.arr[k]; break;
						case '/': res[k] = vec.arr[k] / this.arr[k]; break;
					}
				}
				return this.$def.New(res);
			}
		}
	});

	cout("--- vector")
	let Vector = JEEP.GetStruct("Vector");
	let vec = Vector.New([1,2,3,4,5]);
	let res = vec.ApplyOperator('*');
	res = vec.ApplyOperator('*', res);
	res.Print();

	cout("--- person")
	let Person = DemoEnv.Object.CreateStruct("Person", {
		CONSTRUCTOR: function(){
			cout("Constructor args: "+JSON.stringify(arguments)+" fullname: "+this.GetFullName())
		},
		Variables: {
			firstname: "",
			lastname: "",
		},
		Functions: {
			GetFullName: function(){
				return this.firstname + " " + this.lastname
			}
		}
	})
	cout('> using Person.New("John", "Doe")')
	Person.New("John", "Doe")
	cout('> using Person.InitNew({firstname: "John", lastname: "Smith"})')
	Person.InitNew({firstname: "John", lastname: "Smith"})
	cout('> using Person.New("init", {firstname: "Shri", lastname: "Samanya"})')
	Person.New("init", {firstname: "Shri", lastname: "Samanya"})
})

Run(function(cout, addTitle){
	addTitle("Object Mutilation")

	let Person = DemoEnv.Object.CreateRecord("Person", {
		firstname: "John", 
		lastname: "Doe",
		age: 30,
	})

	let p = Person.New();
	p.city = "unknown"	
	cout(JSON.stringify(p))

	Person = DemoEnv.Object.CreateStruct("Person", {
		CONSTRUCTOR: function(){
			this.city = "unknown";
		},
		Variables: {
			firstname: "John",
			lastname: "Doe",
			age: 30,
		},
		Functions: {
			Print: function(){
				cout(JSON.stringify(this))
			}
		}
	})
	Person.New().Print();
})

Run(function(cout, addTitle){
	addTitle("Variable getter and setter demo");	

	let Class = DemoEnv.Object.CreateClass("Class", {
		Variables: {$get_set$__value: 100},
	});

	let c = new Class;
	cout("c.value: "+c.GetValue())
	cout("> using SetValue")
	c.SetValue(-1);
	cout("c.value: "+c.GetValue())
});

Run(function(cout, addTitle){
	addTitle("Class genration direct method demo");	

	let Class = DemoEnv.Object.CreateClass("Class", {
		CONSTRUCTOR: function(v){
			this.value = v;
			cout(this.$name+" instantiated with "+this.value);
		},
		Variables: {value: 100},
		Functions: {
			Print: function(){
				cout("The value given was "+this.value);
			}
		},
	});

	let c = new Class(100);
	c.Print();
});
	
Run(function(cout, addTitle){
	addTitle("Class generation split method demo");
	
	DemoEnv.Object.DeclareClass("Class", {
		CONSTRUCTOR: function(v){},
		Functions: {$const$__Print: function(){}},
	});
	DemoEnv.Object.DefineClass("Class", {
		CONSTRUCTOR: function(v){
			this.value = v;
			cout(this.$name+" instantiated with "+this.value);
		},
		Variables: {value: 100},
		Functions: {
			$const$__Print: function(){
				cout("The value given was " + this.value);
			}
		},
	});
	let Class = JEEP.GetClass("Class")
	let c = new Class(100);
	c.Print();
});

Run(function(cout, addTitle){
	addTitle("Static members demo");	

	let Class = DemoEnv.Object.CreateClass("Class", {
		CONSTRUCTOR: function(v){
			this.value = v;
			cout(this.$name+" instantiated with "+this.value);
		},
		Variables: {value: 100},
		Functions: {
			Print: function(){
				cout("The public value given was " + this.value);
				this.$def.Print();
			}
		},
		Static: {
			Print: function(){this.RealPrint();},
			RealPrint: function(){cout("The static value is " + this.value);},
			value: -273
		}
	});

	let c = new Class(100);
	c.Print();
	Class.Print();
});
	
Run(function(cout, addTitle){
	addTitle("Protected members demo");	

	let Class = DemoEnv.Object.CreateClass("Class", {
		CONSTRUCTOR: function(v){
			this.value = v;
			cout(this.$name+" instantiated with "+this.value);
		},
		Variables: {value: 0},
		Functions: {
			Print: function(){
				this.$.PrintDetails();
			},
		},
		Protected: {
			count: -1,
			PrintDetails: function(){
				cout("value (public): " + this.value);
				cout("count (protected): " + this.$.count);
			}
		}
	});
	let c = new Class(100);
	c.Print();
	try{c.count=0}catch(e){cout(e.message)}
	try{c.PrintDetails()}catch(e){cout(e.message)}
})

Run(function(cout, addTitle){
	addTitle("Private members demo");	

	cout("-- with usepriv directive")
	let Class = DemoEnv.Object.CreateClass("Class", {
		CONSTRUCTOR: function(v){
			this.value = v;
			cout(this.$name+" instantiated with "+this.value);
		},
		Variables: {value: 0},
		Functions: {
			$usepriv$__Print: function(){
				this.$$.Print();
			},
		},
		Private: {
			value: -1,
			Print: function(){
				cout("The public value given was " + this.value);
				cout("The private value set was " + this.$$.value);
			}
		}
	});
	let c = new Class(100);
	c.Print();

	cout("-- with using-private-members and constructor-using-private-members flags")
	Class = DemoEnv.Object.CreateClass("Class", {
		Flags: "using-private-members, constructor-using-private-members",
		CONSTRUCTOR: function(v){
			this.value = v;
			this.$$.value = v*3;
			cout(this.$name+" instantiated with "+this.value);
		},
		Variables: {value: 0},
		Functions: {
			Print: function(){
				this.$$.Print();
			},
		},
		Private: {
			value: -1,
			Print: function(){
				cout("The public value given was " + this.value);
				cout("The private value set was " + this.$$.value);
			}
		}
	});
	c = new Class(100);
	c.Print();
});

Run(function(cout, addTitle){
	addTitle("Copy construction demo");

	Class = DemoEnv.Object.CreateClass("Class", {
		CONSTRUCTOR: function(s){
			this.str = s;
			cout("MyClass.CONSTRUCTOR "+this.str)
		},
		Functions:{
			Append: function(s){this.str += "+"+s},
			Print: function(){cout(this.str)}
		},
		Variables: {str: ""},
	});
	cout('> using c = new Class("instance")')
	let c = new Class("instance");
	cout('> using d = new Class(c)')
	let d = new Class(c);
	d.Append("copied");
	c.Print();
	d.Print();
	cout('> using new Class(c+"copied")')
	let e = new Class(c+"copied");// not copy constructor
	cout('> using new Class(c, d)')
	let f = new Class(c, d);// not copy constructor
});

Run(function(cout, addTitle){
	addTitle("Construction failure demo");

	DemoEnv.Object.RegisterClass("CtorFailureDemo_Strike", {
		CONSTRUCTOR: function(s){
			throw new Error("Strike!!")
			this.str = s;
			cout("CtorFailureDemo_Strike.CONSTRUCTOR "+this.str)
		},
		Functions:{fucntion(){;}}
	});
	DemoEnv.Object.RegisterClass("CtorFailureDemo_BadSyntax", {
		CONSTRUCTOR: function(s){
			s.Change(0);
			this.str = s;
			cout("CtorFailureDemo_BadSyntax.CONSTRUCTOR "+this.str)
		},
		Functions:{fucntion(){;}}
	});
	DemoEnv.Object.RegisterClass("CtorFailureDemo_FalseReturn", {
		CONSTRUCTOR: function(s){
			this.str = s;
			cout("CtorFailureDemo_FalseReturn.CONSTRUCTOR "+this.str);
			return false
		},
		Functions:{fucntion(){;}}
	});
	let Class = JEEP.GetClass("CtorFailureDemo_Strike");
	try{new Class("Hello")}catch(e){cout(e.message)}
	Class = JEEP.GetClass("CtorFailureDemo_BadSyntax");
	try{new Class("Hello")}catch(e){cout(e.message)}
	Class = JEEP.GetClass("CtorFailureDemo_FalseReturn");
	try{new Class("Hello")}catch(e){cout(e.message)}
});

Run(function(cout, addTitle){
	addTitle("Destructor demo");

	let Class = DemoEnv.Object.CreateClass("Class", {
		CONSTRUCTOR: function(s){
			this.str = s;
			cout("Class.CONSTRUCTOR "+this.str)
		},
		DESTRUCTOR: function(){
			cout("Class.DESTRUCTOR "+this.str)
		},
		Functions:{
			Append: function(s){this.str += "+"+s},
			$scoped$__Test: function(){
				this.$def.ScopedCreate("destructor-enabled")
			},
			$scoped$__TestFail: function(){
				this.$def.ScopedCreate("destructor-enabled")
				this.Run();
			}
		},
		Variables: {str: ""},
	});

	let c = new Class("destructor-not-enabled");
	c.Test();
	try{c.TestFail()}catch(e){cout(e.message)}

	cout("-- logger")
	let Logger = DemoEnv.Object.CreateClass("Logger", {
		DESTRUCTOR: function(){
			cout("Logging the following: "+this.logs.join())
		},
		Functions:{
			Append: function(s){this.logs.push(s)},
		},
		Variables: {logs: []},
	});
	let App = DemoEnv.Object.CreateClass("App", {
		Functions:{
			$scoped$__Work: function(){
				let logger = Logger.ScopedCreate();
				logger.Append("first")
				logger.Append("second")
				logger.Append("third")
				throw new Error("simulated exception from some function")
			},
		},
	});
	let a = new App;
	try{a.Work()}catch(e){cout(e.message)}

	cout("-- destructor throw")
	let D = DemoEnv.Object.CreateClass("DtorThrow", {
		CONSTRUCTOR: function(){cout("DtorThrow instantiated")},
		DESTRUCTOR: function(){
			throw new Error("destructor exception")
		},
		Functions:{
			$scoped$__Work: function(){
				this.$def.ScopedCreate();
				throw new Error("simulated exception from some function")
			},
		},
	});
	let d = new D;
	try{d.Work()}catch(e){cout(e.message)}
	cout("other code")
});

Run(function(cout, addTitle){
	addTitle("Constant function demo");

	let Class = null, c = null;

	cout("--- direct change")
	Class = DemoEnv.Object.CreateClass("Class", {
		Functions:{
			$const$__Print: function(){cout("Class data: " +this.str)},
			$const$__Test: function(){this.str = "changed"}
		},
		Variables: {str: "original"},
	});
	c = new Class();
	c.Print();
	try{c.Test()}catch(e){cout(e.message)}
	c.Print();

	cout("--- indirect change")
	Class = DemoEnv.Object.CreateClass("Class", {
		Functions:{
			Print: function(when){cout(when+" "+"str: "+this.str+" obj.value: "+this.obj.value)},
			$const$__ChangeString: function(){this.str[0] = "changed"},
			$const$__ChangeObject: function(){this.obj.value = 0}
		},
		Variables: {
			str: "original",
			obj: {value: 100},
		},
	});
	c = new Class();
	c.Print("Before change");
	c.ChangeString();
	c.ChangeObject()
	c.Print("After change");

	cout("--- call chain")
	Class = DemoEnv.Object.CreateClass("Class", {
		Functions:{
			$const$__Process: function(callback){
				if(callback)
					callback(this)
				else 
					this.process()
			},
			process: function(){this.str = "changed"}
		},
		Variables: {str: "original"},
	});
	c = new Class();
	try{c.Process()}catch(e){cout(e.message)}
	try{c.Process(function(obj){obj.str = "??"})}catch(e){cout(e.message)}
});

Run(function(cout, addTitle){
	addTitle("Internal variable change demo");

	let Class = null, c = null;

	Class = DemoEnv.Object.CreateClass("Class", {
		Flags: "internal-variable-change",
		Functions:{
			Print: function(when){cout(when+" "+"str: "+this.str)},
			Process: function(){
				this.process();
				cout("Class processed data: " +this.str)
			},
			process: function(){this.str = "changed internally"}
		},
		Variables: {str: "original"},
	});
	c = new Class();
	c.Process()
	c.Print("Before external change")
	c.str[0] = '?'
	c.Print("After external change")
	try{c.str = "??"}catch(e){cout(e.message)}

	cout("-- external call")
	Class = DemoEnv.Object.CreateClass("Class", {
		Flags: "internal-variable-change",
		Functions:{
			Process: function(callback, friend){
				if(callback)
				{
					if(friend) callback("friend-call")
					else this.ExternalCall(callback, "external-call")
				}
				else 
					this.process();
				cout("Class processed data: " +this.str)
			},
			process: function(){this.str = "changed internally"}
		},
		Variables: {str: "original"},
	});
	c = new Class();
	let proc = function(p){c.str = "changed "+p}
	c.Process()
	c.Process(proc, true)
	try{c.Process(proc, false)}catch(e){cout(e.message)}
});

Run(function(cout, addTitle){
	addTitle("Constant arguments demo");

	let Class = null, c = null;
	
	Class = DemoEnv.Object.CreateClass("Class", {
		Functions:{
			$argconst$__Test: function(value, obj){
				value = -99;
				obj.value = -99;
				cout("Inside function- value: "+value+" obj: "+JSON.stringify(obj));
			}
		},
	});
	c = new Class();
	let value = 0, obj = {value: 0};
	cout("Before- value: "+value+" obj: "+JSON.stringify(obj));
	c.Test(value, obj)
	cout("After- value: "+value+" obj: "+JSON.stringify(obj));
});

Run(function(cout, addTitle){
	addTitle("Argument count validation demo");

	let Class = DemoEnv.Object.CreateClass("Class", {
		Functions:{
			$argnum$__Test: function(a, b){cout("args: " +a+" "+b)}
		},
	});
	let c = new Class();
	c.Test(1, 2)
	try{c.Test()}catch(e){cout(e.message)}
	try{c.Test(1)}catch(e){cout(e.message)}
	try{c.Test(1,2,3)}catch(e){cout(e.message)}
});

Run(function(cout, addTitle){
	addTitle("Argument type validation demo");

	let Class = null, c = null;

	Class = DemoEnv.Object.CreateClass("Class", {
		Functions:{
			$Print: "String, Number",
			Print: function(a,b){cout("args: "+a+" "+b)}
		},
	});
	c = new Class();
	c.Print("twice", 2)
	try{c.Print()}catch(e){cout(e.message)}
	try{c.Print(1)}catch(e){cout(e.message)}
	try{c.Print("a", 3, 4)}catch(e){cout(e.message)}

	cout("-- more")

	Class = DemoEnv.Object.CreateClass("Class", {
		Functions: {
			$Print: "Array, Number, Object, String, record.Record, struct.Struct, class.MyLib.Class, ?",
			Print: function(arr, num, obj, str, rec, st, cl, x){
				cout("Class.Print")
				st.Print();
				cls.Print();
				cout("x: "+typeof x)
			},
		}
	})

	function print(){cout(this.$name+".Print")}
	DemoEnv.Object.RegisterRecord("Record", {dummy: 0})
	DemoEnv.Object.RegisterStruct("Struct", {
		Functions: {Print: print},
		Variables: {dummy: 0}
	})
	let Lib = DemoEnv.CreateNamespace("MyLib")
	Lib.RegisterClass("Class", {Functions: {Print: print}})
	let Record = JEEP.GetRecord("Record");
	let Struct = JEEP.GetStruct("Struct");
	let LibClass = Lib.GetClass("Class");

	c = new Class;
	let r = new Record.New()
	let s = Struct.New()
	let cls = new LibClass;
	c.Print([1],2,{},"",r,s,cls,10)
	c.Print([1],2,{},"",r,s,cls,"")
	c.Print([1],2,{},"",r,s,cls,[])
	c.Print([1],2,{},"",r,s,cls,{})

	cout("-- error")
	Class = DemoEnv.Object.CreateClass("Class", {
		Functions:{
			$Print: "record.Record, class.Number",
			Print: function(a,b){cout("args: "+a+" "+b)}
		},
	});
	c = new Class();
	try{c.Print(1,2)}catch(e){cout(e.message)}
	try{c.Print(r,2)}catch(e){cout(e.message)}

});

Run(function(cout, addTitle){
	addTitle("Function API demo");
	let func = null, Class = null;
	
	cout("--- scoping")
	Class = DemoEnv.Object.CreateClass("Class", {
		CONSTRUCTOR: function(s){
			this.str = s;
			cout("Class.CONSTRUCTOR "+this.str)
		},
		DESTRUCTOR: function(){
			cout("Class.DESTRUCTOR "+this.str)
		},
		Variables: {str: ""},
	});

	func = DemoEnv.Function.MakeScoped(function(s){
		Class.ScopedCreate(s)
		return 10;
	});
	let k = func("destructor-enabled-via-MakeScoped");

	let j = DemoEnv.Function.ScopedCall(function(s){
		Class.ScopedCreate(s)
		return 100;
	}, "destructor-enabled-via-ScopedCall");

	cout("MakeScoped returned: "+k+" ScopedCall returned: "+j)

	cout("-- constant argument")
	let obj = {
		a: 100,
		SetA: function(a){this.a = a},
		GetA: function(){return this.a}
	}
	cout("before call: " + obj.a);
	func = DemoEnv.Function.MakeArgConst(function f(obj){
		cout("in call before mod: " + obj.GetA());
		obj.SetA(3);
		cout("in call after mod: " + obj.a);
	});
	func(obj);
	cout("after call: " + obj.a);

	cout("-- argument count")
	func = DemoEnv.Function.MakeArgNumValidated(function printer(what, where){
		cout(what + " in " + where);
	})
	func("puss", "boots")
	try{func()}catch(e){}

	cout("-- argument type")
	func = DemoEnv.Function.MakeArgTypeValidated(
		"String, Number",
		function printer(a,b){
			cout("args: "+a+" "+b)
		});
	func("abc", 10)
	try{func(10, 20)}catch(e){}
})

Run(function(cout, addTitle){
	addTitle("Single inheritance demo");

	DemoEnv.Object.RegisterClass("Base", {
		CONSTRUCTOR: function(){cout("Base.CONSTRUCTOR")},
		DESTRUCTOR: function(){cout("Base.DESTRUCTOR")},
		Functions: {
			Work: function(){cout("working...")}
		}
	})

	DemoEnv.Object.RegisterClass("Derived", {
		BaseClass: "Base",
		CONSTRUCTOR: function(){cout("Derived.CONSTRUCTOR")},
		DESTRUCTOR: function(){cout("Derived.DESTRUCTOR")},
	})

	let Derived = JEEP.GetClass("Derived")
	let d = new Derived;
	d.Work();

	cout("-- CrBaseClass")
	Base = DemoEnv.Object.CreateClass("Base", {
		CONSTRUCTOR: function(a){
			cout("Base.Constructor args: "+a)
		},
	});
	Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [Base],
		CONSTRUCTOR: function(a){
			cout("Derived.Constructor args: "+a)
		},
	});

	new Derived(10);

	cout("-- init ctor")
	Base = DemoEnv.Object.CreateClass("Base", {
		CONSTRUCTOR: function(a){
			cout("Base.Constructor args: "+a)
			cout("Base.Constructor name: "+this.GetName()+" age: "+this.GetAge())					
		},
		Variables: {
			$get$__name: "?",
			$get$__age: 0,
		}
	});
	Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [Base],
		CONSTRUCTOR: function(a){
			cout("Derived.Constructor args: "+a)
			cout("Derived.Constructor city: "+this.GetCity())					
		},
		Variables: {
			$get$__city: "?",
		}
	});
	
	new Derived("init", {name: "unknown", age: 100, city: "unknown"})

	cout("-- destructor order")
	Base = DemoEnv.Object.CreateClass("Base", {
			CONSTRUCTOR: function(){cout("Base.CONSTRUCTOR")},
			DESTRUCTOR: function(){cout("Base.DESTRUCTOR")},
	});
	Derived = DemoEnv.Object.CreateClass("Derived", {
			CrBaseClass: [Base],
			CONSTRUCTOR: function(){cout("Derived.CONSTRUCTOR")},
			DESTRUCTOR: function(){cout("Derived.DESTRUCTOR")},
	});
	DemoEnv.Function.ScopedCall(function(){
		Derived.ScopedCreate();
	})
})

Run(function(cout, addTitle){
	addTitle("Single inheritance instantiation failure demo");

	let TopBase = DemoEnv.Object.CreateClass("TopBase", {
			CONSTRUCTOR: function(){cout("TopBase.CONSTRUCTOR")},
			DESTRUCTOR: function(){cout("TopBase.DESTRUCTOR")},
	});
	let MidBase = DemoEnv.Object.CreateClass("MidBase", {
			CrBaseClass: [TopBase],
			CONSTRUCTOR: function(){cout("MidBase.CONSTRUCTOR")},
			DESTRUCTOR: function(){cout("MidBase.DESTRUCTOR")},
	});
	let LowBase = DemoEnv.Object.CreateClass("LowBase", {
			CrBaseClass: [MidBase],
			CONSTRUCTOR: function(){cout("LowBase.CONSTRUCTOR failing");return false},
			DESTRUCTOR: function(){cout("LowBase.DESTRUCTOR")},
	});
	let Derived = DemoEnv.Object.CreateClass("Derived", {
			CrBaseClass: [LowBase],
			CONSTRUCTOR: function(){cout("Derived.CONSTRUCTOR")},
			DESTRUCTOR: function(){cout("Derived.DESTRUCTOR")},
	});
	try{new Derived;}catch(e){cout(e.message)}
});

Run(function(cout, addTitle){
	addTitle("Single inheritance instantiation failure resource leak demo");

	DemoEnv.Object.RegisterClass("TopBase3", {
			CONSTRUCTOR: function(){cout("TopBase.CONSTRUCTOR")},
			Functions: {Dummy: function(){;}}// to avoid useless class error
	});
	DemoEnv.Object.RegisterClass("Derived3", {
			BaseClass: "TopBase3",
			CONSTRUCTOR: function(){cout("Derived.CONSTRUCTOR failing");return false},
			DESTRUCTOR: function(){cout("Derived.DESTRUCTOR")},
			Functions: {Dummy4: function(){;}}
	});
	DemoEnv.Function.ScopedCall(function(){
		let Class = JEEP.GetClass("Derived3");
		try{Class.ScopedCreate();}catch(e){cout(e.message)}
	});
});

Run(function(cout, addTitle){
	addTitle("Single inheritance manual instantiation failure demo");

	let TopBase = DemoEnv.Object.CreateClass("TopBase", {
			CONSTRUCTOR: function(){
				cout("TopBase.CONSTRUCTOR");
				throw "some error";
			},
			DESTRUCTOR: function(){cout("TopBase.DESTRUCTOR")},
	});
	let MidBase = DemoEnv.Object.CreateClass("MidBase", {
			CrBaseClass: [TopBase],
			CONSTRUCTOR: function(){cout("MidBase.CONSTRUCTOR")},
			DESTRUCTOR: function(){cout("MidBase.DESTRUCTOR")},
	});
	let LowBase = DemoEnv.Object.CreateClass("LowBase", {
			CrBaseClass: [MidBase],
			CONSTRUCTOR: function(){cout("LowBase.CONSTRUCTOR failing");return false},
			DESTRUCTOR: function(){cout("LowBase.DESTRUCTOR")},
	});
	let Derived = DemoEnv.Object.CreateClass("Derived", {
			Flags: "manual-base-construction",
			CrBaseClass: [LowBase],
			CONSTRUCTOR: function(){
				cout("Derived.CONSTRUCTOR");
				this.$base.MidBase.CONSTRUCTOR();
				this.$base.LowBase.CONSTRUCTOR();
				this.$base.TopBase.CONSTRUCTOR();
			},
			DESTRUCTOR: function(){cout("Derived.DESTRUCTOR")},
	});
	DemoEnv.Function.ScopedCall(function(){
		try{Derived.ScopedCreate();}catch(e){cout(e.message)}
	});
});

Run(function(cout, addTitle){
	addTitle("Single inheritance polymorphism demo");

	let TopBase = DemoEnv.Object.CreateClass("TopBase", {
			Functions: {
				TopBaseWork: function(){cout("TopBaseWork details: "+this.getTopWorkDetails())},
				$virtual$__getTopWorkDetails: function(){return "<from top base>"}
			},
	});
	let MidBase = DemoEnv.Object.CreateClass("MidBase", {
			CrBaseClass: [TopBase],
			Functions: {
				MidBaseWork: function(){cout("MidBaseWork details: "+this.getMidWorkDetails())},
				$virtual$__getMidWorkDetails: function(){return "<from mid base>"},
				$virtual$__getTopWorkDetails: function(){return "<from mid base>"}
			},
	});
	let Derived = DemoEnv.Object.CreateClass("Derived", {
			CrBaseClass: [MidBase],
			Functions: {
				$virtual$__getTopWorkDetails: function(){
					return "<from derived>" + this.$base.MidBase.getTopWorkDetails();
				}
		}
	});
	let c = new Derived;
	c.TopBaseWork();
	c.MidBaseWork();	

	cout("--ancestor access")
	Derived = DemoEnv.Object.CreateClass("Derived", {
			Flags: "need-ancestor-access",
			CrBaseClass: [MidBase],
			Functions: {
				$virtual$__getTopWorkDetails: function(){
					return "<from derived>" + 
					this.$base.MidBase.getTopWorkDetails() +
					this.$base.TopBase.getTopWorkDetails();
				}
		}
	});
	c = new Derived;
	c.TopBaseWork();

	cout("--abstract function")
	TopBase = DemoEnv.Object.CreateClass("TopBase", {
			Functions: {
				TopBaseWork: function(){
					let id = this.getID();
					cout("TopBaseWork details:\nname: "+this.getName()+"\nid: "+id)
					cout("can work? " +this.canWork(id))
					cout("will work? " +this.willWork(id))
				},
				$virtual$__getName: function(){return "<name from top base>"},
				$virtual$__getID: function(){return "<id from top base>"},
				$abstract$__canWork: function(id){},
				$abstract$__willWork: function(id){},
			},
	});
	MidBase = DemoEnv.Object.CreateClass("MidBase", {
			CrBaseClass: [TopBase],
			Functions: {
				$virtual$__willWork: function(id){return "yes"},
				$abstract$__canWork: function(id){},
				$abstract$__midbaseCanWork: function(id){},
		}
	});
	Derived = DemoEnv.Object.CreateClass("Derived", {
			CrBaseClass: [MidBase],
			Functions: {
				$abstract$__midbaseCanWork: function(id){},
				$abstract$__derivedCanWork: function(id){},
			}
	});
	
	try{new Derived;}catch(e){}
});

Run(function(cout, addTitle){
	addTitle("Single inheritance invalid virtual calls demo");

	let Base = DemoEnv.Object.CreateClass("Base", {		
		CONSTRUCTOR: function(){this.Print()},
		Functions: {$virtual$__Print: function(){cout("Base.Print")}}
	});
	let Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [Base],
		CONSTRUCTOR: function(){this.Print()},
		Functions: {$virtual$__Print: function(){cout("Derived.Print")}}
	});
	new Derived;

	Base = DemoEnv.Object.CreateClass("Base", {});
	Derived = DemoEnv.Object.CreateClass("Derived", {
		Flags: "trap-invalid-virtual-call",
		CrBaseClass: [Base],
		CONSTRUCTOR: function(){this.Test()},
		Functions: {$virtual$__Test: function(){cout("if this prints the test failed")}}
	});
	try{(new Derived).Test()}catch(e){cout(e.message)}
	
	Derived = DemoEnv.Object.CreateClass("Derived", {
		Flags: "trap-invalid-virtual-call",
		CrBaseClass: [Base],
		CONSTRUCTOR: function(callback){callback(this)},
		Functions: {$virtual$__Test: function(){cout("if this prints the test failed")}}
	});
	try
	{
		new Derived(function(c){
			c.Test()
		})
	}
	catch(e){cout(e.message)}

	Derived = DemoEnv.Object.CreateClass("Derived", {
		Flags: "trap-invalid-virtual-call",
		CrBaseClass: [Base],
		DESTRUCTOR: function(){this.Test()},
		Functions: {$virtual$__Test: function(){cout("if this prints the test failed")}}
	});
	try
	{
		DemoEnv.Function.ScopedCall(function(){
			Derived.ScopedCreate()
		})
	}
	catch(e){cout(e.message)}
})

Run(function(cout, addTitle){
	addTitle("Single inheritance replaced virtual functions demo");

	let TopBase = DemoEnv.Object.CreateClass("TopBase", {
			Functions: {
				TopBaseWork: function(){cout("TopBaseWork details:\nname: "+this.getName()+"\nid: "+this.getID())},
				$virtual$__getName: function(){return "<name from top base>"},
				$virtual$__getID: function(){return "<id from top base>"}
			},
	});
	let Derived = DemoEnv.Object.CreateClass("Derived", {
			CrBaseClass: [TopBase],
			Functions: {
				$virtual$replace$__getID: function(){
					return "<id from derived>" + 
					(this.$base.TopBase.getID ? this.$base.TopBase.getID() : "")
				},
				$virtual$__getName: function(){
					return "<name from derived>" + 
					(this.$base.TopBase.getName ? this.$base.TopBase.getName() : "")
				}
		}
	});
	let c = new Derived;
	c.TopBaseWork();

	cout("--replaced")
	Derived = DemoEnv.Object.CreateClass("Derived", {
			Flags: "replace-virtual-functions",
			CrBaseClass: [TopBase],
			Functions: {
				$virtual$replace$__getID: function(){
					return "<id from derived>" + 
					(this.$base && this.$base.TopBase.getID ? this.$base.TopBase.getID() : "")
				},
				$virtual$__getName: function(){
					return "<name from derived>" + 
					(this.$base && this.$base.TopBase.getName ? this.$base.TopBase.getName() : "")
				}
		}
	});
	c = new Derived;
	c.TopBaseWork();
});

Run(function(cout, addTitle){
	addTitle("Single inheritance abstract functions demo");

	DemoEnv.Object.RegisterClass("TopBase7", {
			Functions: {
				TopBaseWork: function(){
					let id = this.getID();
					cout("TopBaseWork details:\nname: "+this.getName()+"\nid: "+id)
					cout("can work? " +this.canWork(id))
					cout("will work? " +this.willWork(id))
				},
				$virtual$__getName: function(){return "<name from top base>"},
				$virtual$__getID: function(){return "<id from top base>"},
				$abstract$__canWork: function(id){},
				$abstract$__willWork: function(id){},
			},
	});
	DemoEnv.Object.RegisterClass("MidBase7", {
			BaseClass: "TopBase7",
			Functions: {
				$virtual$replace$__getID: function(){return "<id from mid base>"},
				$virtual$__getName: function(){return "<name from mid base>"},
		}
	});
	DemoEnv.Object.RegisterClass("Derived7", {
			BaseClass: "MidBase7",
			Functions: {
				$virtual$replace$__getID: function(){return "<id from derived>"},
				$virtual$__getName: function(){return "<name from derived>"},
				$virtual$__canWork: function(id){return "yes"},
				$virtual$__willWork: function(id){return "yes yes"},
		}
	});
	let Class = JEEP.GetClass("Derived7");
	let c = new Class;
	c.TopBaseWork();
	cout("-- instantiation")
	try{new(JEEP.GetClass("MidBase7"))}catch(e){cout(e.message)}

	cout("-- re-enforce abstractness")
	DemoEnv.Object.RegisterClass("TopBase7a", {
			Functions: {
				TopBaseWork: function(){cout(this.getName())},
				$virtual$__getName: function(){return "<name from mid base>"},
		}
	});
	DemoEnv.Object.RegisterClass("MidBase7a", {
			BaseClass: "TopBase7a",
			Functions: {
				$abstract$__getName: function(){},
		}
	});
	DemoEnv.Object.RegisterClass("Derived7a", {
			BaseClass: "MidBase7a",
			Functions: {
				$virtual$__getName: function(){return "<name from derived>"},
		}
	});
	Class = JEEP.GetClass("Derived7a");
	c = new Class;
	c.TopBaseWork();
	try{new(JEEP.GetClass("MidBase7a"))}catch(e){cout(e.message)}

});

Run(function(cout, addTitle){
	addTitle("Multiple inheritance demo");

	cout("-- ctor dtor order")
	let TopBase = DemoEnv.Object.CreateClass("TopBase", {
		CONSTRUCTOR: function(){cout("TopBase.CONSTRUCTOR")},
		DESTRUCTOR: function(){cout("TopBase.DESTRUCTOR")},
	})
	let MidBaseA = DemoEnv.Object.CreateClass("MidBaseA", {
		CrBaseClass: [TopBase],
		CONSTRUCTOR: function(){cout("MidBaseA.CONSTRUCTOR")},
		DESTRUCTOR: function(){cout("MidBaseA.DESTRUCTOR")},
	})
	let MidBaseB = DemoEnv.Object.CreateClass("MidBaseB", {
		CrBaseClass: [TopBase],
		CONSTRUCTOR: function(){cout("MidBaseB.CONSTRUCTOR")},
		DESTRUCTOR: function(){cout("MidBaseB.DESTRUCTOR")},
	})
	let BaseX = DemoEnv.Object.CreateClass("BaseX", {
		CONSTRUCTOR: function(){cout("BaseX.CONSTRUCTOR")},
		DESTRUCTOR: function(){cout("BaseX.DESTRUCTOR")},
	})
	let Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [MidBaseA, MidBaseB, BaseX],
		CONSTRUCTOR: function(){cout("Derived.CONSTRUCTOR")},
		DESTRUCTOR: function(){cout("Derived.DESTRUCTOR")},
	})
	DemoEnv.Function.ScopedCall(function(){
		Derived.ScopedCreate();
	})

	cout("-- construction failure")
	MidBaseA = DemoEnv.Object.CreateClass("MidBaseA", {
		CrBaseClass: [TopBase],
		CONSTRUCTOR: function(){throw 'MidBaseA exception'},
	})
	let BaseY = DemoEnv.Object.CreateClass("BaseX", {
		CrBaseClass: [BaseX],
		CONSTRUCTOR: function(){cout("BaseY.CONSTRUCTOR")},
		DESTRUCTOR: function(){cout("BaseY.DESTRUCTOR")},
	})
	Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [BaseY, MidBaseA, MidBaseB],
		CONSTRUCTOR: function(){cout("Derived.CONSTRUCTOR")},
		DESTRUCTOR: function(){cout("Derived.DESTRUCTOR")},
	})
	try
	{
		DemoEnv.Function.ScopedCall(function(){
			Derived.ScopedCreate();
		})
	}catch(e){cout(e.message)}

	cout("-- reinforced abstraction")
	TopBase = DemoEnv.Object.CreateClass("TopBase", {
		Functions: {$virtual$__SomeFunction: function(){}}
	})
	MidBaseA = DemoEnv.Object.CreateClass("MidBaseA", {
		CrBaseClass: [TopBase],
	})
	MidBaseB = DemoEnv.Object.CreateClass("MidBaseB", {
		CrBaseClass: [TopBase],
		Functions: {$abstract$__SomeFunction: function(){}}
	})
	Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [MidBaseA, MidBaseB],
	})
	try{new Derived}catch(e){cout(e.message)}
})

Run(function(cout, addTitle){
	addTitle("Mermaid demo");

	DemoEnv.Object.RegisterClass("Animal", {
		Functions: {
			LiveOneMoment: function(){
				cout(this.$name+" living one moment.");
				this.Breathe();
				this.Move(1,1)
			},
			$abstract$__Move: function(x, y){},
			$abstract$__Breathe: function(){},
		}
	});
	DemoEnv.Object.RegisterClass("Human", {
		BaseClass: "Animal",
		Functions: {
			$virtual$__Move: function(x, y){cout("  walking to "+x+" "+y)},
			$virtual$__Breathe: function(){cout("  breathing with lungs")},
		}
	});
	DemoEnv.Object.RegisterClass("Fish", {
		BaseClass: "Animal",
		Functions: {
			$virtual$__Move: function(x, y){cout("  swimming to "+x+" "+y)},
			$virtual$__Breathe: function(){cout("  breathing with gills")},
		}
	});
	DemoEnv.Object.CreateClass("Mermaid", {
		BaseClass: "Human, Fish",
		Functions: {
			$virtual$__Move: function(x, y){this.$base.Fish.Move(x,y)},
			$virtual$__Breathe: function(){this.$base.Human.Breathe()},
		}
	});
	DemoEnv.Object.RegisterClass("Mermaid", {
		BaseClass: "Human, Fish",
		Functions: {
			$abstract$__Move: function(x, y){},
			$abstract$__Breathe: function(){},
		}
	});
	DemoEnv.Object.RegisterClass("MMHeavenly", {
		Flags: "need-ancestor-access",
		BaseClass: "Mermaid",
		Functions: {
			$virtual$__Move: function(x, y){this.$base.Fish.Move(x,y)},
			$virtual$__Breathe: function(){this.$base.Human.Breathe()},
		}
	});
	DemoEnv.Object.RegisterClass("MMHellish", {
		Flags: "need-ancestor-access",
		BaseClass: "Mermaid",
		Functions: {
			$virtual$__Move: function(x, y){
				cout("  standing upright in water")
				this.$base.Human.Move(x,y)
				cout("  dunking head back in water")
			},
			$virtual$__Breathe: function(){
				this.$base.Fish.Breathe()
				cout("  holding air for 5 seconds")
			},
		}
	});

	DemoEnv.Object.RegisterClass("Android", {
		BaseClass: "Animal",
		Functions: {
			$virtual$__Move: function(x, y){cout("<stepping to> "+x+" "+y)},
			$virtual$__Breathe: function(){cout("<pumping in 10 cc air>")},
		}
	});

	DemoEnv.Object.RegisterClass("MMWestWorld", {
		BaseClass: "Mermaid, Android",
		Functions: {
			$virtual$__Move: function(x, y){
				cout("  <meep morp zeep> <ARNOLD SAYS MOVE>")
				cout("                   <activating fin motor> STEPPING TO "+x+" "+y)
				cout("  <meep morp zeep> <ARNOLD SAYS LOOK CAPTIVATING> ")
				cout("                   <activating skin pigment> GLOWING")
				cout("                   <activating lip motors> POUTING")
			},
			$virtual$__Breathe: function(){
				cout("  <meep morp zeep> <ARNOLD SAYS BREATHE>")
				cout("                   <activating pump> INTAKING 10 cc air")
			},
		}
	});

	let mmarr = [
		new(JEEP.GetClass("MMHeavenly")),
		new(JEEP.GetClass("MMHellish")),
		new(JEEP.GetClass("MMWestWorld")),
	];
	for(let k = 0; k<mmarr.length; k++)
		mmarr[k].LiveOneMoment();

	// let Mermaid = JEEP.GetClass("Mermaid");
	// let m = new Mermaid;
	// m.LiveOneMoment();
});

Run(function(cout, addTitle){
	addTitle("Wrapper basic demo");
	DemoEnv.Object.RegisterClass("WrDemoBase", {
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
	});
	let Wrapper = DemoEnv.Object.CreateWrapperClass("Wrapper", {
		Class: "WrDemoBase",
		Functions: {Change: "Modify"},
		Variables: {value: "val"}
	});
	let Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [Wrapper]
	})
	cout("Derived.prototype.Change " + (Derived.prototype.Change ? "present" : "absent"));
	cout("Derived.prototype.CallChange " + (Derived.prototype.CallChange ? "present" : "absent"));
	let d = new Derived;
	cout("c.value " + (undefined!=d.value ? "present" : "absent"));
	cout("c.count " + (undefined!=d.count ? "present" : "absent"));
	d.CallChange(100);// test old function (and variable) name linking
	d.Print();
	d.Modify(-1);/// test new function (and variable) name linking
	d.Print();
	d.val = -2;// test new variable name linking
	d.Print();
})


Run(function(cout, addTitle){
	addTitle("Wrapper Print demo");
	DemoEnv.Object.RegisterClass("OutPrinter", {
		Functions: {
			OutPrint: function(what){
				this.$.DoPrint(what)
			},
		},
		Protected: {
			$virtual$__DoPrint: function(what){
				cout("OutPrinter printing "+what+"...")
			}
		}
	});
	DemoEnv.Object.RegisterClass("InPrinter", {
		Functions: {
			InPrint: function(what){
				this.$.DoPrint(what)
				cout("InPrinter processing data "+this.$.data+"...")
			},
		},
		Protected: {
			data: "",
			$abstract$__DoPrint: function(what){}
		}
	});
	let InPrinterWrapper = DemoEnv.Object.CreateWrapperClass("InPrinterWrapper", {
		Class: "InPrinter",
		Functions: {DoPrint: "DoInPrint"},
	});
	let Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [InPrinterWrapper],
		BaseClass: "OutPrinter",
		Protected: {
			$virtual$__DoPrint: function(what){
				cout("Derived printing "+what+ " to screen...")
			},
			$virtual$__DoInPrint: function(what){
				this.$.data = what * 100;
			}
		}
	})
	let c = new Derived;
	c.OutPrint(-1);
	c.InPrint(-1);
})

Run(function(cout, addTitle){
	addTitle("Wrapper robustness demo");
	DemoEnv.Object.RegisterClass("WrRobDemo", {
		Functions: {
			Print: function(){cout("Class.value: "+this.value)},
			CallRead: function(){this.Read()},
			$const$__Read: function(){this.value = 10;},
		},
		Variables: {value: 0},
	});
	let Wrapper = DemoEnv.Object.CreateWrapperClass("Wrapper", {
		Class: "WrRobDemo",
		Functions: {Read: "NewRead"},
		Variables: {value: "val"}
	});
	let Class = DemoEnv.Object.CreateClass("Derived", {
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
})

Run(function(cout, addTitle){
	addTitle("Wrapper polymorphism demo");
	DemoEnv.Object.RegisterClass("WrPolyDemo", {
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
	let BaseWrapper = DemoEnv.Object.CreateWrapperClass("BaseWrapper", {
		Class: "WrPolyDemo",
		Functions: {getChangeValue: "GCV"}
	});
	let Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [BaseWrapper],
		Functions: {
			Test: function(){
				this.CallChange()
			},
			$virtual$__printName: function(){cout("Derived")},
			$virtual$__GCV: function(){return 100},
		},
	});
	d = new Derived;
	d.Test();
})

Run(function(cout, addTitle){
	addTitle("Wrapper in multiple inheritance demo");

	let commonDesc = {
		Functions: {
			Print: function(){
				cout(this.$name+".value: "+this.value)
			},
			Change: function(v){
				this.value = v;
				this.Print();
			},
			CallChange: function(v){this.Change(v)},
		},
		Variables: {value: 0},
	}

	DemoEnv.Object.RegisterClass("WrMIBaseA", commonDesc);
	let BaseAW = DemoEnv.Object.CreateWrapperClass("BaseAWrapper", {
		Class: "WrMIBaseA",
		Functions: {Print: "PrintA", Change: "ChangeA", CallChange: "CallChangeA"},
		Variables: {value: "avalue"}
	});

	DemoEnv.Object.RegisterClass("WrMIBaseB", commonDesc);
	let BaseBW = DemoEnv.Object.CreateWrapperClass("BaseBWrapper", {
		Class: "WrMIBaseB",
		Functions: {Print: "PrintB", Change: "ChangeB", CallChange: "CallChangeB"},
		Variables: {value: "bvalue"}
	});

	DemoEnv.Object.RegisterClass("WrBaseX", {
		Variables: {value: 29},
		Functions: {
			Print: function(){cout("BaseX.value: "+this.value)}
		}
	})
	let Derived = DemoEnv.Object.CreateClass("Derived", {
		BaseClass: "WrBaseX",	
		CrBaseClass: [BaseAW, BaseBW],
	});
	d = new Derived;
	// test BaseA
	d.CallChangeA(100)
	d.Print()
	d.PrintB();
	d.ChangeA(200)
	d.avalue = -1;
	d.PrintA();
	// test BaseB
	d.CallChangeB(300)
	d.Print()
	d.PrintA()
	d.ChangeB(400)
	d.bvalue = -2;
	d.PrintB();
})

Run(function(cout, addTitle){
	addTitle("Multiple wrappers in single inheritance demo");
	
	let commonDesc = {
		Functions: {
			Print: function(){
				cout(this.$name+".value: "+this.value)
				cout(this.$name+".count: "+this.count)
			},
			Change: function(v){
				this.value = v;
			},
			CallChange: function(v){this.Change(v)},
		},
		Variables: {value: 0, count: 33},
	}

	DemoEnv.Object.RegisterClass("WrTopBase", commonDesc);
	let TopBaseWrapper = DemoEnv.Object.CreateWrapperClass("TopBaseWrapper", {
		Class: "WrTopBase",
		Functions: {Change: "ModifyTop", CallChange: "CallModifyTop", Print: "PrintTop"},
		Variables: {value: "topval", count: "topcount"}
	});

	let mdesc = commonDesc;
	mdesc.CrBaseClass = [TopBaseWrapper]
	DemoEnv.Object.RegisterClass("WrMidBase", mdesc);
	let MidBaseWrapper = DemoEnv.Object.CreateWrapperClass("MidBaseWrapper", {
		Class: "WrMidBase",
		Functions: {Change: "ModifyMid"},
		Variables: {value: "midval"}
	});

	let Derived = DemoEnv.Object.CreateClass("Derived", {
		CrBaseClass: [MidBaseWrapper]
	})
	let d = new Derived;
	// test top
	d.CallModifyTop(100);
	d.PrintTop();
	d.ModifyTop(200);
	d.PrintTop();
	d.topval = -1;
	d.PrintTop();
	// test mid
	d.CallChange(300);
	d.Print();
	d.ModifyMid(400);
	d.Print();
	d.midval = -2;
	d.Print();
})

// --- utils demo

Run(function(cout, addTitle){
	addTitle("Utils object keys demo");

	cout("-- ObjectIterator")
	let obj = {a: "A", b: "B", c: "C"}
	let iter = JEEP.Utils.ObjectIterator.New(obj)
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		cout(pair.key+":"+pair.value)
	}

	cout("> resetting")
	iter.Reset({name: "unknown", location: "undisclosed"})
	while(iter.GetNext())
	{
		cout(iter.GetCurrKey()+":"+iter.GetCurrValue())
	}

	cout("-- using GetKeyValueArray")
	let kvarr = JEEP.Utils.GetKeyValueArray(obj);
	for(let k = 0; k<kvarr.length; k++)
		cout(kvarr[k].key+":"+kvarr[k].value)

	cout("-- using ForEachKey")
	JEEP.Utils.ForEachKey(
		{a: 0, b: -1, c: 10},
		function(obj, pair){return pair.value < 0;},
		function(obj, pair, res){cout(pair.key+":"+pair.value+" is less than zero? "+(res?"true":"false"))},
	);
})

Run(function(cout, addTitle){
	addTitle("Utils clone and copy functions demo");

	let Struct = DemoEnv.Object.CreateStruct("Struct", {
		CONSTRUCTOR: function(v){this.obj.value = v},
		Variables: {obj: {value: -1}},
		Functions: {
			Print: function(which){cout(which+" obj.value: "+this.obj.value)},
			ChangeValue: function(v){this.obj.value = v}
		}
	})

	let s = Struct.New(100)
	s.Print("original");
	cout("-- shallow clone")
	let cs = JEEP.Utils.ShallowClone(s)
	cs.ChangeValue(-1)
	cs.Print("cloned");
	s.Print("original");
	cout("-- deep clone")
	let ds = JEEP.Utils.DeepClone(s)
	ds.ChangeValue(33)
	ds.Print("cloned");
	s.Print("original");

	cout("-- CopyProps")
	let obj = {a: "A", b: "B", c: "C"}
	cout(JSON.stringify(obj))
	let cobj = {}
	JEEP.Utils.CopyProps(obj, cobj, ["a", "c"])
	cout(JSON.stringify(cobj))

	cout("-- CopyDefinedProps")
	obj = {}
	let value = -1;
	Object.defineProperty(obj, "value", {
		enumerable: true,
		configurable: false,
		set: function(v){value=v},
		get: function(){return value},		
	})
	let cobj1 = {}, cobj2 = {};
	cout("obj.value: "+obj.value)
	JEEP.Utils.CopyProps(obj, cobj1, ["value"])
	JEEP.Utils.CopyDefinedProps(obj, cobj2, ["value"])
	cout("obj.value (CopyProps): "+cobj1.value)
	cout("obj.value (CopyDefinedProps): "+cobj2.value)
	obj.value = 100;
	cout("obj.value: "+obj.value)
	cout("obj.value (CopyProps): "+cobj1.value)
	cout("obj.value (CopyDefinedProps): "+cobj2.value)

	cout("-- Merge")
	obj = {a: "A", b: "B", c: "C"}
	cout(JSON.stringify(obj))
	cobj = {x: "x", y: "y", z: "z"}
	JEEP.Utils.Merge(obj, cobj)
	cout(JSON.stringify(cobj))
})

Run(function(cout, addTitle){
	addTitle("Utils FlagProcessor demo");

	let F_RED = 1;
	let F_BLUE = 2;
	let F_GREEN = 4;

	let colorFlags = JEEP.Utils.FlagProcessor.New({
		"red": F_RED,
		"blue": F_BLUE,
		"green": F_GREEN,
	})

	let fs = "red, green"
	cout("flag string: '"+fs+"'")
	let res = colorFlags.Process({flags: fs})
	cout("red present? "+(res.flags & F_RED ? "yes":"no"))
	cout("blue present? "+(res.flags & F_BLUE ? "yes":"no"))
	cout("green present? "+(res.flags & F_GREEN ? "yes":"no"))

	cout("flag string '"+fs+"' with singleOnly true")
	res = colorFlags.Process({singleOnly: true, flags: fs})
	cout(JSON.stringify(res))

	fs = "red, green, black"
	cout("flag string '"+fs+"' with markError true")
	res = colorFlags.Process({markError: true, flags: fs})
	cout("These colors are invalid: "+res.errors.join())

})

Run(function(cout, addTitle){
	addTitle("Utils MessageFormatter demo");

	let MF = JEEP.Utils.MessageFormatter.New({
		"-arg-delim": "-arg- $arg$",
		"-say-greetings": "First say -greetings- and then mention the -subject-.",
		"introduce-yourself": "My name is $last-name$, $first-name$ $last-name$.",
		"dollar": "$ means dollar",
	});

	let m = MF.Get("say-greetings", {
		greetings: "Hello",
		subject: "World",
	})
	cout(m);

	m = MF.Get("introduce-yourself", {
		"first-name": "Olya",
		"last-name": "Povlatsky"
	})
	cout(m);
	
	m = MF.Get("dollar", {
		how: "good",
		what: "World",
	})
	cout(m);
	
	m = MF.Get("arg-delim", {
		arg: "argument",
		what: "World",
	})
	cout(m);
})

Run(function(cout, addTitle){
	addTitle("Production mode retain-const demo");
	function run(mode, env){
		cout("running in "+mode)
		let Class = env.Object.CreateClass("Class", {
			Functions: {
				$const$__Read: function(){this.value = 10;},
				Test: function(){ this.Read(); cout("this.value: "+this.value)}
			},
			Variables: {value: 0},
		});
		let c = new Class;
		try{c.Test()}catch(e){cout(e.message)}
	}
	run("non-retained production mode", JEEP.CreateEnvironment({
		mode: "production-mode", 
		client: "jeep-aware",
	}))
	run("retained production mode", JEEP.CreateEnvironment({
		mode: "production-mode", 
		client: "jeep-aware",
		flags: "retain-const"
	}))
})

Run(function(cout, addTitle){
	addTitle("Production mode retain-abstract-check demo");
	function run(mode, env){
		cout("running in "+mode)
		let Class = env.Object.CreateClass("Class", {
			CONSTRUCTOR: function(){cout(this.$name+".CONSTRUCTOR")},
			Functions: {
				$abstract$__Read: function(){},
			},
		});
		new Class;
	}
	run("non-retained production mode", JEEP.CreateEnvironment({
		mode: "production-mode", 
		client: "jeep-aware",
	}))
	try{
		run("retained production mode", JEEP.CreateEnvironment({
			mode: "production-mode", 
			client: "jeep-aware",
			flags: "retain-abstract-check"
		}))
	}catch(e){cout(e.message)}
})


Run(function(cout, addTitle){
	addTitle("Production mode retain-invalid-virtual-trap demo");
	function run(mode, env){
		cout("running in "+mode)
		let Class = env.Object.CreateClass("Class", {
			Flags: "trap-invalid-virtual-call",
			CONSTRUCTOR: function(){this.Read()},
			Functions: {
				$virtual$__Read: function(){cout("Reading...")},
			},
		});
		new Class;
	}
	run("non-retained production mode", JEEP.CreateEnvironment({
		mode: "production-mode", 
		client: "jeep-aware",
	}))
	try{
		run("retained production mode", JEEP.CreateEnvironment({
			mode: "production-mode", 
			client: "jeep-aware",
			flags: "retain-invalid-virtual-trap"
		}))
	}catch(e){cout(e.message)}
})

Run(function(cout, addTitle){
	addTitle("Jeep client type demo");
	function run(env){
		cout("production mode? "+(env.IsDevMode()?"no":"yes"))
		cout("client jeep aware? "+(env.IsClientJeepAware()?"yes":"no"))
		if(!env.IsClientJeepAware())
		{
			env = JEEP.CreateEnvironment({
				mode: "production-mode", 
				client: "jeep-agnostic",
				flags: "retain-argnum"
			})
		}
		let Class = env.Object.CreateClass("Class", {
			Functions: {
				$argnum$__Read: function(where, howmuch){
					cout("Reading whare: "+where+" howmuch "+howmuch)
				},
			},
		});
		return Class;
	}
	let Class = run(JEEP.CreateEnvironment({
		mode: "production-mode", 
		client: "jeep-aware",
	}))
	let c = new Class;
	c.Read(1);
	
	try{
		let Class = run(JEEP.CreateEnvironment({
			mode: "production-mode", 
			client: "jeep-agnostic",
		}))
		let c = new Class;
		c.Read(1);
	}catch(e){cout(e.message)}
})

Run(function(cout, addTitle){
	addTitle("Namespace partition demo");
	function InitLib(Env)
	{
		let Lib = Env.CreateNamespace("Lib");
		let parts = Lib.CreatePartition(["utils", "fileproc",]);
		let desc = {
			CONSTRUCTOR: function(){cout(this.$name)},
			Variables: {value: 0},
		}
		Lib.RegisterStruct("MainStruct", desc)
		Lib.utils.RegisterStruct("UtilsStruct", desc)
		Lib.fileproc.RegisterStruct("FileProcStruct", desc)
		return Lib;
	}

//	let Env = JEEP.CreateEnvironment({client: "jeep-aware", mode: "production-mode"})
	let Env = JEEP.CreateEnvironment({client: "jeep-aware", mode: "development-mode"})
	let lib = InitLib(Env);
	let MainStruct = lib.GetStruct("MainStruct")
	MainStruct.New();
	let UtilsStruct = lib.utils.GetStruct("UtilsStruct")
	UtilsStruct.New();
	let FileProcStruct = lib.fileproc.GetStruct("FileProcStruct")
	FileProcStruct.New();
})

Run(function(cout, addTitle){
	addTitle("Namespace alias demo");
	function InitLLGL(Env)
	{
		let Lib = Env.CreateNamespace("LLGL");
		Lib.RegisterRecord("Point", {x: 0, y: 0})
		Lib.RegisterRecord("Color", {base: "black", alpha: 0})
		Lib.RegisterRecord("Shape", {shape: "round"})
		let Point = Lib.GetRecord("Point")
		let Color = Lib.GetRecord("Color")
		let Shape = Lib.GetRecord("Shape")
		function putPixel(point, color, shape){
			if(Point.InstanceOf(point) == false)
				throw "Expected "+Point.$name;
			if(Color.InstanceOf(color) == false)
				throw "Expected "+Color.$name;
			if(shape && Shape.InstanceOf(shape) == false)
				throw "Expected "+Shape.$name;
			cout("Putting "+color.base+" pixel at x: "+point.x+" y: "+point.y)
		}
		Lib.PutPixel = putPixel;
		return Lib;
	}

	function InitHLGL(Env)
	{
		let llgl = InitLLGL(Env);
		let Lib = Env.CreateNamespace("HLGL");
		Lib.CreateAlias(llgl, {Record: "Point, Color"})
		Lib.RegisterRecord("Shape", {shape: "round"})
		Lib.PutPixel = function(p, c, s){llgl.PutPixel(p, c, s)}
		return Lib;
	}

//	let Env = JEEP.CreateEnvironment({client: "jeep-aware", mode: "production-mode"})
	let Env = JEEP.CreateEnvironment({client: "jeep-aware", mode: "development-mode"})
	let Lib = InitHLGL(Env);
	let Point = Lib.GetRecord("Point");
	let Color = Lib.GetRecord("Color");;
	let Shape = Lib.GetRecord("Shape")
	let pt = Point.New({x: 10, y: 20});
	let clr = Color.New({base: "yellow"});
	Lib.PutPixel(pt,clr)
	try{Lib.PutPixel(pt,clr, Shape.New())}catch(e){cout(e)}
})

Run(function(cout, addTitle){
	addTitle("Library demo");
	function InitMyLib(){
		if(this.initialized)
			cout(this.$name + " already initialized")
		else
		{
			this.lib = DemoEnv.CreateNamespace(this.$name);
			this.lib.RegisterRecord("Shape", {shape: "round"});
			this.initialized = true;
		}
		return this.lib;
	}
	JEEP.RegisterLibrary("MyLib", InitMyLib, {initialized: false, lib: null})
	JEEP.InitLibrary("MyLib");
	let MyLib = JEEP.InitLibrary("MyLib");
	let Shape = MyLib.GetRecord("Shape")
	let s = Shape.New();
	cout(s.$name+".shape: "+s.shape)

	cout("--- auto managed")
	JEEP.RegisterLibrary("SomeLib", function(){
		cout("initializing "+this.$name+"...")
		let lib = DemoEnv.CreateNamespace(this.$name);
		lib.RegisterRecord("Shape", {shape: "round"});
		return lib;
	})
	JEEP.InitLibrary("SomeLib");
	let SomeLib = JEEP.InitLibrary("SomeLib");
	Shape = SomeLib.GetRecord("Shape")
	s = Shape.New();
	cout(s.$name+".shape: "+s.shape)
})

Run(function(cout, addTitle){cout("end of all demo")})// to show that no exceptions were raised in the demo code
