/*
 --------------------------------------------------------------------
 Designed and Developed by Vinay.M.S
 --------------------------------------------------------------------
 
 JEEP is a C++ inspired framework that brings OOP to JavaScript, well beyond what is natively
 possible with the language. Most OOP behavior is retained from C++, but there are some changes 
 owing to the nature of the JavaScript language. Some other changes are with those aspects of 
 C++ that I don't like as they seem conceptually unsound. I took this opportunity to design 
 them in a way I feel is conceptually sound.

 There are far too many features to list here, so highlighting only eight most attractive ones.

 Qualitative
 	* robustness
 	* maintainable and extensible classes
 	* intuitive class description
 	* improved productivity and performance

 Technical
 	* multiple inheritance
 	* virtual and abstract functions
  	* public, protected and private members
	* development and production mode split

 --------------------------------------------------------------------
 This class is usable subject to MIT license.
 --------------------------------------------------------------------
 The MIT License (MIT) http://opensource.org/licenses/MIT
 
 Copyright (c) 2017 Vinay.M.S
 
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 -------------------------------------------------------------------
 */

// Note: Abort2 is the attempted refactoring of the Abort function
// TODO: convert all messages to templates

JEEP = {
	// info = {mode, flags, lib}
	CreateEnvironment: function(info){
		// validate
		if(!info.mode || (info.mode != "development-mode" && info.mode != "production-mode"))
			this.impl.Abort2({where: "CreateEnvironment", id: "env-expects", idnames: {which: "mode"}});
		if(!info.client || (info.client != "jeep-aware" && info.client != "jeep-agnostic"))
			this.impl.Abort2({where: "CreateEnvironment", id: "env-expects", idnames: {which: "client"}});
		if(info.flags && (typeof info.flags !== "string" || info.flags.length == 0))
			this.impl.Abort2({where: "CreateEnvironment", id: "env-expects", idnames: {which: "flags"}});

		// get the flags
		let flags = info.client + "," + info.mode;
		if(info.flags)
			flags += ","+info.flags;
		let res = this.impl.EnvDirectives.Process({flags: flags, markError: true});
		if(res.errors.length > 0)
			this.impl.Abort2({where: "CreateEnvironment", id: "env-flags-invalid", idnames: {flags: res.errors.join()}});
	
		if(res.flags & JEEP.impl.ENV_DEVMODEFLAG)
			res.flags = JEEP.impl.ENV_DEVMODE
		
		// setup the env
		let Environment = {
			Object:{},
			Function:{},
			// basic status query helpers for clients
			IsDevMode: function(){return res.flags == JEEP.impl.ENV_DEVMODE},
			IsClientJeepAware: function(){return res.flags & JEEP.impl.ENV_CLIENT_JEEPAWARE},
			flags: res.flags,
		};
		// This is private. It is needed as implementation uses this.env 
		Environment.Object.env = Environment.Function.env = Environment;
		// This is needed for functions inside Environment
		Environment.env = Environment;
		this.Utils.CopyProps(this.impl, Environment.Object, [
			"CreateRecord", "CreateStruct", "CreateClass",
			"RegisterRecord", "RegisterStruct", 
			"RegisterClass", "DeclareClass", "DefineClass", "CreateWrapperClass",
		]);
		this.Utils.CopyProps(this.impl, Environment.Function, [
			"MakeScoped", "ScopedCall", 
			"MakeArgConst", "MakeArgNumValidated", "MakeArgTypeValidated",			 
		]);		
		Environment.CreateNamespace = function(nsname){
			JEEP.impl.ValidateNamespaceName(this.env, nsname);
			let Namespace = {
				CreateAlias: function(src, info){
					if(info.Record)
						JEEP.impl.NamespaceAlias(src, nsname, info.Record, "GetRecord", "record")
					if(info.Structure)
						JEEP.impl.NamespaceAlias(src, nsname, info.Structure, "GetStruct", "struct")
					if(info.Class)
						JEEP.impl.NamespaceAlias(src, nsname, info.Class, "GetClass", "class")
				},
				CreatePartition: function(namearr){
					for(let k = 0; k<namearr.length; k++)
					{
						let name = namearr[k];
						let partition = Environment.CreateNamespace(nsname+"."+name);
						if(Environment.IsDevMode() && this[name])
							JEEP.impl.Abort({noclass: true, where: "CreatePartition", id: "ns-partition-exists", idnames: {name: "nsname", part: name}});
						this[name] = partition;
					}
				},
				RegisterRecord: function(name, spec){
					return JEEP.impl.RegisterRecord.call(Environment, nsname+"."+name, spec)
				},
				GetRecord: function(name){
					return JEEP.GetRecord.call(Environment, nsname+"."+name)
				},
				RegisterStruct: function(name, spec){
					return JEEP.impl.RegisterStruct.call(Environment, nsname+"."+name, spec)
				},
				GetStruct: function(name){
					return JEEP.GetStruct.call(Environment, nsname+"."+name)
				},
				RegisterClass: function(name ,spec){
					return JEEP.impl.RegisterClass.call(Environment, nsname+"."+name, spec)
				},
				DeclareClass: function(name, spec){
					return JEEP.impl.DeclareClass.call(Environment, nsname+"."+name, spec)
				},
				DefineClass: function(name, spec){
					return JEEP.impl.DefineClass.call(Environment, nsname+"."+name, spec)
				},
				GetClass: function(name){
					return JEEP.GetClass.call(Environment, nsname+"."+name)
				},
			}
			return Namespace;
		}

		// done
		return Environment;
	},
	GetRecord: function(name)
	{
		let def = JEEP.impl.ObjectDatabase.Get(name, "record");
		if(def === undefined)
			JEEP.impl.Abort2({where: "GetRecord", id: "object-accessor", idnames: {type: "record", name: name}});
		return def;
	},
	GetStruct: function(name)
	{
		let def = JEEP.impl.ObjectDatabase.Get(name, "struct");
		if(def === undefined)
			JEEP.impl.Abort2({where: "GetStruct", id: "object-accessor", idnames: {type: "struct", name: name}});
		return def;
	},
	GetClass: function(name)
	{
		let def = JEEP.impl.ObjectDatabase.Get(name, "class");
		if(def === undefined)
			JEEP.impl.Abort2({where: "GetClass", id: "object-accessor", idnames: {type: "class", name: name}});
		return def;
	},
	RegisterLibrary: function(name, func, param){
		if(arguments.length < 2 || arguments.length > 3)
			JEEP.impl.Abort2({where: "RegisterLibrary", id: "invalid-lib-reg-arg"});
		if(!name || typeof name !== 'string')
			JEEP.impl.Abort2({where: "RegisterLibrary", id: "invalid-lib-reg-arg"});
		if(! func || typeof func != 'function')
			JEEP.impl.Abort2({where: "RegisterLibrary", id: "invalid-lib-reg-func", idnames: {name: name}});
		if(param && typeof param == 'object' && param.$name !== undefined)
			JEEP.impl.Abort2({where: "RegisterLibrary", id: "invalid-lib-reg-param", idnames: {name: name}});
		if(JEEP.impl.Library[name] !== undefined)
			JEEP.impl.Abort2({where: "RegisterLibrary", id: "library-present", idnames: {name: name}});
		let manage = !param;
		param = param || {}
		param.$name = name;
		JEEP.impl.Library[name] = {func: func, param: param, res: null, manage: manage};
	},
	InitLibrary: function(name){
		if(arguments.length < 1 || !name || typeof name !== 'string')
			JEEP.impl.Abort2({where: "InitLibrary", id: "invalid-lib-init-arg"});
		let lib = JEEP.impl.Library[name];
		if(lib === undefined)
			JEEP.impl.Abort2({where: "InitLibrary", id: "library-absent", idnames: {name: name}});
		if(lib.res)
			return lib.res;
		let args = Array.prototype.slice.call(arguments,1);
		let res = lib.func.apply(lib.param, args);
		if(lib.manage)
			lib.res = res;
		return res;
	},
	SetStdErr: function(printer){
		let curr = JEEP.impl.stderr;
		JEEP.impl.stderr = printer;
		return curr;
	},
	Utils: {}
};

//---------------------------------------
// testing api
//---------------------------------------

JEEP.InitTest = function()
{
	Tester.Init();
}

JEEP.CreateTestCase = function(test)
{
	JEEP.impl.ObjectDatabase.Reset();
	JEEP.impl.Library = {};
	JEEP.impl.testCase = undefined;
	if(test)
	{
		JEEP.impl.testCase = Tester.NewCase(test);
		return function(what){JEEP.impl.testCase.AddGenerated(what)}
	}
}

JEEP.RunTestCase = function()
{
	return JEEP.impl.testCase.Compare();
}

/*************************************************************/
/* implementation */
/*************************************************************/

JEEP.impl = {}

JEEP.impl.NamespaceAlias = function(src, destName, info, access, type)
{
	let names = info.split(",").map(function(item){return item.trim()})
	for(let k = 0; k<names.length; k++)
	{
		let n = names[k]
		let Obj = src[access](n)
		let name = Obj.$name.substr(Obj.$name.lastIndexOf('.')+1)
		let alias = destName + "." + name
		if(JEEP.impl.ObjectDatabase.Get(alias, type))
			JEEP.impl.Abort2({where: "Namespace.CreateAlias", id: "alias-exists", idnames: {type: type, where: destName, alias: name}});
		JEEP.impl.ObjectDatabase.Add(Obj, alias, type);
	}
}

JEEP.impl.ValidateApiArgs = function(where)
{
	let args = Array.prototype.slice.call(arguments,1);
	if(args.length != 2)
		JEEP.impl.Abort2({where: where, id: "invalid-api-arg"});
	let name = args[0];
	if(!name || typeof name != 'string')
		JEEP.impl.Abort2({where: where, id: "invalid-api-arg"});
	let spec = args[1];
	if(!spec || typeof spec != 'object')
		JEEP.impl.Abort2({where: where, id: "invalid-api-arg"});
	JEEP.impl.ValidateObjName(where, name)
}

JEEP.impl.RegisterRecord = function(name, spec)
{
	if((this.env.flags == JEEP.impl.ENV_DEVMODE))
	{
		let args = ["RegisterRecord"].concat(Array.prototype.slice.call(arguments,0));
		JEEP.impl.ValidateApiArgs.apply(JEEP.impl, args)
	}
	spec = JEEP.Utils.DeepClone(spec);
	JEEP.impl.ValidateObjectNotRegistered("RegisterRecord", name, "record");
	JEEP.impl.DoDefineRecord(this.env, false, name, spec);
}

JEEP.impl.CreateRecord = function(name, spec)
{
	if((this.env.flags == JEEP.impl.ENV_DEVMODE))
	{
		let args = ["CreateRecord"].concat(Array.prototype.slice.call(arguments,0));
		JEEP.impl.ValidateApiArgs.apply(JEEP.impl, args)
	}
	spec = JEEP.Utils.DeepClone(spec);
	return JEEP.impl.DoDefineRecord(this.env, true, name, spec);
}

JEEP.impl.RegisterStruct = function(name, spec)
{
	if((this.env.flags == JEEP.impl.ENV_DEVMODE))
	{
		let args = ["RegisterStruct"].concat(Array.prototype.slice.call(arguments,0));
		JEEP.impl.ValidateApiArgs.apply(JEEP.impl, args)
	}
	spec = JEEP.Utils.DeepClone(spec);
	JEEP.impl.ValidateObjectNotRegistered("RegisterStruct", name, "struct");
	JEEP.impl.DoDefineStruct(this.env, false, name, spec);
}

JEEP.impl.CreateStruct = function(name, spec)
{
	if((this.env.flags == JEEP.impl.ENV_DEVMODE))
	{
		let args = ["CreateStruct"].concat(Array.prototype.slice.call(arguments,0));
		JEEP.impl.ValidateApiArgs.apply(JEEP.impl, args)
	}
	spec = JEEP.Utils.DeepClone(spec);
	return JEEP.impl.DoDefineStruct(this.env, true, name, spec);
}

JEEP.impl.RegisterClass = function(name, spec)
{
	let devmode = this.env.IsDevMode();
	if(devmode)
	{
		let args = ["RegisterClass"].concat(Array.prototype.slice.call(arguments,0));
		JEEP.impl.ValidateApiArgs.apply(JEEP.impl, args)
	}
	spec = JEEP.Utils.DeepClone(spec);
	JEEP.impl.ProcessClassSpec({
		env: this.env,
		spec: spec,
		where: "RegisterClass", 
		name: name, 
		noImpl: false
	});
	JEEP.impl.ValidateObjectNotRegistered("RegisterClass", name, "class");
	spec.name = name;
	let def = JEEP.impl.Begin(this.env, spec);
	JEEP.impl.End(this.env, def, false);
	if(devmode && !JEEP.impl.Errors.Empty())
		JEEP.impl.QuickAbort(def._jeepdef_.className);
}

JEEP.impl.CreateClass = function(name, spec)
{
	let devmode = this.env.IsDevMode();
	if(devmode)
	{
		let args = ["CreateClass"].concat(Array.prototype.slice.call(arguments,0));
		JEEP.impl.ValidateApiArgs.apply(JEEP.impl, args)
	}
	spec = JEEP.Utils.DeepClone(spec);
	JEEP.impl.ProcessClassSpec({
		env: this.env,
		spec: spec,
		where: "CreateClass", 
		name: name, 
		noImpl: false
	});
	spec.name = name;
	let def = JEEP.impl.Begin(this.env, spec);
	let Class = JEEP.impl.End(this.env, def, false, true);
	if(devmode && !JEEP.impl.Errors.Empty())
		JEEP.impl.QuickAbort(def._jeepdef_.className);
	return Class;
}

JEEP.impl.DeclareClass = function(name, spec)
{
	let devmode = this.env.IsDevMode();
	if(devmode)
	{
		let args = ["DeclareClass"].concat(Array.prototype.slice.call(arguments,0));
		JEEP.impl.ValidateApiArgs.apply(JEEP.impl, args)
		if(spec.Flags)
			JEEP.impl.Abort({where: "DeclareClass", reason: "Flags are not allowed to be declared", className: name})
		if(spec.Variables)
			JEEP.impl.Abort({where: "DeclareClass", reason: "Member variables are not allowed to be declared", className: name})
		if(spec.Private)
			JEEP.impl.Abort({where: "DeclareClass", reason: "Private members are not allowed to be declared", className: name})
	}
	spec = JEEP.Utils.DeepClone(spec);
	JEEP.impl.ProcessClassSpec({
		env: this.env,
		spec: spec,
		where: "DeclareClass", 
		name: name, 
		noImpl: true,
		inDeclare: true,
	});

	JEEP.impl.ValidateObjectNotRegistered("DeclareClass", name, "class");
	let respec = spec;
	let funcMap = {}//{name: {type, length}
	let vtable = {};
	let typedFuncs = null;
	let protFuncs = null;
	if(spec.CONSTRUCTOR)
		funcMap['CONSTRUCTOR'] = {type: 0, argcount: spec.CONSTRUCTOR.length};
	if(respec.Functions)
	{
		let funcs = JEEP.impl.ProcessFuncDesc(this.env, respec.Functions, true);
		respec.Functions = null;
		typedFuncs = funcs.typedFuncs;
		if(funcs.validFuncs)
		{
			if(devmode)
			{
				let iter = JEEP.Utils.ObjectIterator.New(funcs.validFuncs);
				while(iter.GetNext())
				{
					let pair = iter.GetCurrPair();
					if(pair.value.type & JEEP.impl.FUNC_USEPRIV)
						JEEP.impl.AddError("invalid-func-directive-declare",{which: "usepriv", name: pair.key})
					if(pair.value.type & JEEP.impl.FUNC_REPLACE)
						JEEP.impl.AddError("invalid-func-directive-declare",{which: "replace", name: pair.key})
				}
			}
			JEEP.impl.DeclarePreProc(this.env, name, funcs, funcMap, false, vtable);
		}
	}
	if(respec.Protected)
	{
		let pi = JEEP.impl.ProcessClubbedSpec(this.env, respec.Protected);
		if(pi.vars)
			JEEP.impl.Abort2({where: "DeclareClass", id: "prot-var-decl", objName: name, objType: "class"})
		if(pi.funcs && pi.funcs.validFuncs)
		{
			let iter = JEEP.Utils.ObjectIterator.New(pi.funcs.validFuncs);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				if(!(pair.value.type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT)))
					JEEP.impl.Abort2({where: "DeclareClass", id: "prot-plain-func", objName: name, objType: "class"})
			}
		}
		protFuncs = pi.funcs;
		respec.Protected = null;
	}
	if(respec.Static)
	{
		let si = JEEP.impl.ProcessClubbedSpec(this.env, respec.Static);
		if(si.vars)
			JEEP.impl.Abort({where: "DeclareClass", reason: "Static variables are not allowed to be declared", className: name})
		if(si.funcs && si.funcs.validFuncs)
			JEEP.impl.DeclarePreProc(this.env, name, si.funcs, funcMap, true);
		respec.Static = null;
	}
	// Abort on error because if declaration has wrong syntax there is no need to continue.
	if(devmode && !JEEP.impl.Errors.Empty())
		JEEP.impl.QuickAbort(name);
	respec.name = name;

	let decl = JEEP.impl.Begin(this.env, respec);
	// add declare define specific information
	decl._jeepdef_.ddProtFuncs = protFuncs;
	decl._jeepdef_.ddFuncMap = funcMap;
	if(typedFuncs)
	{
		let ddty = {};
		let iter = JEEP.Utils.ObjectIterator.New(typedFuncs);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			ddty[pair.key] = pair.value.type;
		}
		decl._jeepdef_.ddTypedFuncs = ddty;
	}
	if(Object.keys(vtable).length > 0)
		decl._jeepdef_.ddVtable = vtable;
	// mark the declaration
	JEEP.impl.AddDecl(decl);
}

JEEP.impl.DefineClass = function(name, def)
{
	let devmode = this.env.IsDevMode();
	if(devmode)
	{
		let args = ["DefineClass"].concat(Array.prototype.slice.call(arguments,0));
		JEEP.impl.ValidateApiArgs.apply(JEEP.impl, args)
		if(def.BaseClass)
			JEEP.impl.Abort({where: "DefineClass", reason: "BaseClass must be declared, not defined", className: name})
	}
	def = JEEP.Utils.DeepClone(def);
	JEEP.impl.ProcessClassSpec({
		env: this.env,
		spec: def,
		where: "DefineClass", 
		name: name, 
		noImpl: false
	});

	JEEP.impl.ValidateObjectNotRegistered("DefineClass", name, "class");
	let decl = JEEP.impl.GetDecl(name);
	let redecl = decl;
	if(def.CONSTRUCTOR)
	{
		let savedProto = redecl.prototype;
		redecl = JEEP.impl.GenerateConstructor(this.env, def.CONSTRUCTOR);
		redecl.CONSTRUCTOR = def.CONSTRUCTOR;
		redecl.prototype = savedProto;
		redecl._jeepdef_ = decl._jeepdef_;
		redecl._jeepdef_.CONSTRUCTOR = def.CONSTRUCTOR;
		if(def.Flags)
			redecl._jeepdef_.flags = def._jeepdef_.flags;
		if(def._jeepdef_.priv)
			redecl._jeepdef_.priv = def._jeepdef_.priv;
	}
	JEEP.impl.CreateCopyProps(def, redecl._jeepdef_, ["Variables", "Functions", "Static", "Protected", "Private"]);
	redecl._jeepdef_.ddProtFuncs = decl._jeepdef_.ddProtFuncs;

	// generate
	if(def.Variables)
		redecl._jeepdef_.Variables = JEEP.impl.ProcessVarDesc(this.env, def.Variables);
	if(def.Functions)
	{
		let res = JEEP.impl.ProcessFuncDesc(this.env, def.Functions)
		redecl._jeepdef_.Functions = res.validFuncs
		redecl._jeepdef_.TypedFunctions = res.typedFuncs;
	}
	if(def.Static)
		redecl._jeepdef_.Static = JEEP.impl.ProcessClubbedSpec(this.env, def.Static);
	if(def.Protected)
		JEEP.impl.ProcessProtectedInfo(this.env, def, redecl);
	if(def.Private)
		JEEP.impl.ProcessPrivateInfo(this.env, def, redecl);
	JEEP.impl.End(this.env, redecl, true);	
		
	// delete declare-define related information as they are not useful after generation
	delete redecl._jeepdef_.ddProtFuncs;
	delete redecl._jeepdef_.ddFuncMap;
	delete redecl._jeepdef_.ddVtable;
	
	if(devmode && !JEEP.impl.Errors.Empty())
		JEEP.impl.QuickAbort(decl._jeepdef_.className);

	// done
}

// info = {Class, Functions, Variables}
JEEP.impl.CreateWrapperClass = function(name, info)
{
	let devmode = this.env.IsDevMode();
	if(devmode)
	{
		let args = ["CreateWrapperClass"].concat(Array.prototype.slice.call(arguments,0));
		JEEP.impl.ValidateApiArgs.apply(JEEP.impl, args)
	}
	
	let ClassDef = JEEP.impl.ObjectDatabase.Get(info.Class, "class");
	if(ClassDef === undefined)
		JEEP.impl.Abort2({where: "CreateWrapperClass", id: "object-accessor", idnames: {type: "class", name: name}});
	
	// clone with a constructor that discourages instantiation of wrapper classes
	let WrapperDef = JEEP.impl.ShallowCloneClass(ClassDef, function(){JEEP.impl.Abort({runtime: true, reason: "Wrapper classes aren't meant for instantiation", className: info.defname})});
	WrapperDef._jeepdef_ = JEEP.impl.ShallowClone(ClassDef._jeepdef_);
	WrapperDef.prototype.$def = WrapperDef;
		
	// when virtual names are given, derive a class from the wrapped class in order 
	// to relay the virtual function calls to the instance
	let WrDerivedDef = null;
	let relayVF = ClassDef.prototype._jeep_.vtable !== undefined;
	if(relayVF)	
	{
		WrDerivedDef = JEEP.impl.ShallowCloneClass(ClassDef, function(){});// this clones prototype too
		WrDerivedDef.prototype.SetupVirtualRelay = function(inst, funcNames, funcRenameMap, wrapped)
		{
			if(wrapped)
				wrapped = wrapped;
			let wrprot = null;
			let instProto = Object.getPrototypeOf(inst);
			let ref = wrapped ? inst.$ : instProto;
			let loc = wrapped ? wrapped.$ : WrDerivedDef.prototype;
			if(loc != ref)
			{
				let iter = JEEP.Utils.ObjectIterator.New(funcNames);
				while(iter.GetNext())
				{
					let n = iter.GetCurrKey();
					let wrvf = function(){return ref[n].apply(inst, arguments)};
					wrvf._jeepowner_ = WrDerivedDef;
					loc[n] = wrvf;
				}
			}
			if(funcRenameMap)
			{
				let iter = JEEP.Utils.ObjectIterator.New(funcRenameMap);
				while(iter.GetNext())
				{
					let pair = iter.GetCurrPair();
					let wrvrenf = function(){return ref[pair.value].apply(inst, arguments)};
					wrvrenf._jeepowner_ = WrDerivedDef;
					loc[pair.key] = wrvrenf;
				}
			}
		}
	}
	
	let WrClassDef = function(){}
	WrClassDef.prototype = WrDerivedDef ? WrDerivedDef.prototype : ClassDef.prototype;

	let wname = "_jwr"+name;
	let wvtable = null
	let protFuncs = {};
	let plainProtFuncs = {};
	let renVnamesProt = {};
	let vnamesProt = [];
	let varmap = {};
	let classVars = {};
	let protVars = {};
	let protVarMap = {};
	let env = this.env;
	let enforceProtected = (env.flags == JEEP.impl.ENV_DEVMODE) || (env.flags & JEEP.impl.ENV_RETAIN_PROTECTED)

	// setup the object constructor and destructor
	WrapperDef.prototype.CONSTRUCTOR = function(){
		// create the wraped object
		let wrapped = new WrClassDef;
		
		// setup virtual relay if any
		if(relayVF)
			wrapped.SetupVirtualRelay(this, this._jeep_.vtable, wvtable);

		// set the wrapped object for relay functions
		this._jeepwrap_ = this._jeepwrap_ || {}
		wrapped._jeepwrap_ = wrapped._jeepwrap_ || {}
		// copy existing wrapper info for possible multiple wrappings
		let iter = JEEP.Utils.ObjectIterator.New(this._jeepwrap_);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			wrapped._jeepwrap_[pair.key] = pair.value;
		}
		// add current wrapper info
		this._jeepwrap_[name] = WrapperDef._jeepdef_[wname];// add to this rather than this._jeep_ for quicker access
		
		let wrobj = JEEP.Utils.ObjectIterator.New(this._jeepwrap_[name]);
		while(wrobj.GetNext())
			wrobj.GetCurrValue().wrapped = wrapped;

		if(this.$)
		{
			// Create a sentinel target object so that the link remains intack. Otherwise the one created inside the
			// InstantiateProtectedMembers will not be affected by the updates done wo wrapped.$._jeepsentinel_, and
			// all robustness aspects will fall flat when wrapped with protected members.
			let noCreateVars = this.$._jeepsentinel_ !== undefined;
			let sentinel = this.$._jeepsentinel_ ? {} : null;
			if(sentinel)
				JEEP.Utils.CopyDefinedProps(this.$._jeepsentinel_, sentinel);
			JEEP.impl.InstantiateProtectedMembers(env, ClassDef, wrapped, enforceProtected, sentinel, this.$name, noCreateVars)
			if(sentinel && !noCreateVars)
				wrapped.$._jeepsentinel_ = sentinel;
			if(noCreateVars)
				wrapped.$._jeepsentinel_ = this.$._jeepsentinel_;
			// setup relay
			let iter = JEEP.Utils.ObjectIterator.New(protFuncs);
			while(iter.GetNext())
			{
				let fname = iter.GetCurrKey();
				this.$[fname] = function(){
					return wrapped.$[fname].apply(wrapped, arguments)
				}
			}
			// rename
			iter.Reset(plainProtFuncs);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				let origProtFunc = this.$[pair.key];
				delete this.$[pair.key]
				this.$[pair.value] = origProtFunc;
			}
			// setup virtual relay
			wrapped.SetupVirtualRelay(this, vnamesProt, renVnamesProt, wrapped);

			iter.Reset(this.$);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				if(pair.key[0] == '$' || pair.key[0] == '_' || typeof pair.value === 'function')
					continue;
				let oldName = protVarMap[pair.key];
				let added = (!oldName && info.Variables && info.Variables[pair.key] !== undefined)
				oldName = oldName || pair.key;
				if(protVars[oldName])
				{
					let dp = Object.getOwnPropertyDescriptor(this.$, pair.key);
					if(wrapped.$._jeepsentinel_)
					{
						if(!added)
							Object.defineProperty(wrapped.$, oldName, dp);
					}
					else if(!added)
					{
						wrapped.$[oldName] = this.$[pair.key];
						if(!dp.set)// any function would do
							Object.defineProperty(this.$, pair.key, {
								enumerable: true,
								configurable: false,
								set: function(v){wrapped.$[oldName]=v},
								get: function(){return wrapped.$[oldName]},
							});
					}
				}
			}
		}

		// link the variables
		wrapped._jeepsentinel_ = this._jeepsentinel_;
		let viter = JEEP.Utils.ObjectIterator.New(this);
		while(viter.GetNext())
		{
			let pair = viter.GetCurrPair();
			if(pair.key[0] == '$' || pair.key == '_jeepsentinel_' || typeof pair.value === 'function')
				continue;
			let oldName = varmap[pair.key];
			let added = (!oldName && info.Variables && info.Variables[pair.key] !== undefined)
			oldName = oldName || pair.key;
			if(classVars[oldName])
			{
				let dp = Object.getOwnPropertyDescriptor(this, pair.key);
				if(wrapped._jeepsentinel_)
				{
					if(!added)
						Object.defineProperty(wrapped, oldName, dp);
				}
				else if(!added)
				{
					wrapped[oldName] = this[pair.key];
					if(!dp.set)// any function would do
						Object.defineProperty(this, pair.key, {
							enumerable: true,
							configurable: false,
							set: function(v){wrapped[oldName]=v},
							get: function(){return wrapped[oldName]},
						});
				}
			}
		}

		// call the original constructor with the wrapped object
		return ClassDef.prototype.CONSTRUCTOR.apply(wrapped, arguments);
	};
	
	let jwrap = {};
	
	// setup the destructor, is same as other functions setup below
	if(ClassDef.prototype.DESTRUCTOR)
	{
		WrapperDef.prototype.DESTRUCTOR = function(){
			let p = this[name]["DESTRUCTOR"];
			p.func.apply(p.wrapped, arguments);
		}
		jwrap["DESTRUCTOR"] = {func: ClassDef.prototype.DESTRUCTOR, wrapped: null};
	}

	// overwrite the functions to relay the calls to the object
	let iter = JEEP.Utils.ObjectIterator.New(WrapperDef.prototype);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		if(pair.key == "CONSTRUCTOR" || pair.key == "DESTRUCTOR" || pair.key[0] == "$" || typeof pair.value !== 'function')
			continue;
		let fname = pair.key;		
		let wrf = WrapperDef.prototype[fname];
		let fjb = wrf._jeepowner_;
		jwrap[fname] = {func: ClassDef.prototype[fname], wrapped: null};
		wrf = function(){
			let p = this._jeepwrap_[name][fname];
			return p.func.apply(p.wrapped, arguments);
		}
		wrf._jeepowner_ = fjb;
		WrapperDef.prototype[pair.key] = wrf;
	}
	WrapperDef._jeepdef_[wname] = jwrap;
	
	// rename function by copying the old name to new name and deleting the old name
	let wjeep = JEEP.Utils.ShallowClone(WrapperDef.prototype._jeep_);
	let vtable = JEEP.Utils.ShallowClone(wjeep.vtable);
	wjeep.vtable = vtable;
	WrapperDef.prototype._jeep_ = wjeep;

	let defProtFuncs = null;
	let wdefProtFuncs = null;
	let wdefProtVars = null;
	if(WrapperDef._jeepdef_.prot)
	{
		// Cloning can be optimized by delaying untill after it is known that protected are renamed
		let wjd = {}
		JEEP.Utils.CopyProps(WrapperDef._jeepdef_, wjd);
		WrapperDef._jeepdef_ = wjd;
		let wdefProt = {};
		JEEP.Utils.CopyProps(WrapperDef._jeepdef_.prot, wdefProt)
		wjd.prot = wdefProt;
		if(WrapperDef._jeepdef_.prot.funcs)
		{
			let pfuncs = {};
			JEEP.Utils.CopyProps(wjd.prot.funcs, pfuncs)
			wjd.prot.funcs = pfuncs;
			wdefProtFuncs = {};
			JEEP.Utils.CopyProps(wjd.prot.funcs.validFuncs, wdefProtFuncs);
			wjd.prot.funcs.validFuncs = wdefProtFuncs;
		}
		if(WrapperDef._jeepdef_.prot.vars)
		{
			protVars = WrapperDef._jeepdef_.prot.vars.validVars;
			let pvars = {};
			JEEP.Utils.CopyProps(wjd.prot.vars, pvars)
			wjd.prot.vars = pvars;
			wdefProtVars = {};
			JEEP.Utils.CopyProps(wjd.prot.vars.validVars, wdefProtVars);
			wjd.prot.vars.validVars = wdefProtVars;
		}
		WrapperDef._jeepdef_ = wjd;
	}

	if(info.Functions)
	{
		let vnameTemp = {}
		if(WrapperDef._jeepdef_.prot && WrapperDef._jeepdef_.prot.funcs)
		{
			defProtFuncs = WrapperDef._jeepdef_.prot.funcs.validFuncs;
			let iter = JEEP.Utils.ObjectIterator.New(defProtFuncs);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				protFuncs[pair.key] = true;
				if(pair.value.type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT))
					vnameTemp[pair.key] = true;
			}
		}

		let iter = JEEP.Utils.ObjectIterator.New(info.Functions);
		while(iter.GetNext())
		{
			let pi = null;
			let pair = iter.GetCurrPair();
			if(defProtFuncs)
			{
				pi = defProtFuncs[pair.key];
				if(pi)
				{
					if(pi.type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT))
					{
						if(vnameTemp[pair.key])
						{
							delete protFuncs[pair.key];
							delete vnameTemp[pair.key];
							vnameTemp[pair.value] = true;
						}
						renVnamesProt[pair.key] = pair.value;
					}
					else
					{
						plainProtFuncs[pair.key] = pair.value;
					}
					delete wdefProtFuncs[pair.key]
					wdefProtFuncs[pair.value] = pi;
				}
			}

			let f = pi ? pi.func : WrapperDef.prototype[pair.key];
			let vi = null;
			if(vtable)
				vi = vtable[pair.key]
			// Abstract won't exist in prototype, so check vtable before issuing the error
			if(f === undefined && vi === undefined)
			{
				JEEP.impl.AddError("wrap-invalid-name", {className: info.Class, type: "function", name: pair.key});
				continue;
			}
			if(vi)
			{
				vi = JEEP.Utils.ShallowClone(vi);
				delete vtable[pair.key];
				if(vi.ownVF)// null for abstract type, same as testing type for FUNC_ABSTRACT but lesser code
				{
					f._jeepowner_ = vi.ownVF._jeepowner_;
					vi.ownVF = f;
				}
				vi.type |= JEEP.impl.FUNC_WRAPPED;
				vi.orig = name;
				vtable[pair.value] = vi;
				wvtable = wvtable || {}
				wvtable[pair.key] = pair.value;
			}
			delete WrapperDef.prototype[pair.key];
			WrapperDef.prototype[pair.value] = f;
		}
		vnamesProt = Object.keys(vnameTemp)
	}
	
	// Note that prototype is pre cloned but _jeepdef_.Variables isn't. 
	// It must be done so as to not change wrapped class
	if(info.Variables)
	{
		let renvars = null;
		if(WrapperDef._jeepdef_.Variables)
		{
			renvars = {};
			classVars = WrapperDef._jeepdef_.Variables.validVars
			let viter = JEEP.Utils.ObjectIterator.New(WrapperDef._jeepdef_.Variables.validVars)
			while(viter.GetNext())
			{
				let pair = viter.GetCurrPair();
				renvars[pair.key] = pair.value;
			}
		}
		let iter = JEEP.Utils.ObjectIterator.New(info.Variables);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			if((classVars[pair.key] === undefined) && (!wdefProtVars || (wdefProtVars[pair.key] === undefined)))
			{
				JEEP.impl.AddError("wrap-invalid-name", {className: info.Class, type: "variable", name: pair.key});
				continue;
			}
			if(protVars[pair.key])
			{	
				let v = wdefProtVars[pair.key];
				delete wdefProtVars[pair.key];
				wdefProtVars[pair.value] = v;
				protVarMap[pair.value] = pair.key;
			}
			if(renvars)
			{
				let v = renvars[pair.key];
				delete renvars[pair.key];
				renvars[pair.value] = v;
				varmap[pair.value] = pair.key;
			}
		}			
		if(WrapperDef._jeepdef_.Variables)
		{
			WrapperDef._jeepdef_.Variables = JEEP.Utils.ShallowClone(WrapperDef._jeepdef_.Variables)
			WrapperDef._jeepdef_.Variables.validVars = renvars
			WrapperDef.prototype._jeep_.varmap = varmap;
		}
	}

	// Abort on error because if declaration has wrong syntax there is no need to continue.
	if(this.env.IsDevMode() && !JEEP.impl.Errors.Empty())
		JEEP.impl.Abort2({where: "CreateWrapperClass", id: "wrap-invalid-spec"});

	return WrapperDef;
}

JEEP.impl.MakeScoped = function(func)
{
	return JEEP.impl.MakeScopedFunction(func);
}

JEEP.impl.ScopedCall = function(func)
{
	let f = JEEP.impl.MakeScopedFunction(func);
	let args = Array.prototype.slice.call(arguments,1);
	return f.apply(null, args);
}

JEEP.impl.MakeArgConst = function(func)
{
	if(!func.name)
		JEEP.impl.Abort2({where: "MakeArgConst", id: "noname-makefunc"})
	return JEEP.impl.MakeArgConstFunction(func);
}

JEEP.impl.MakeArgNumValidated = function(func)
{
	if(!func.name)
		JEEP.impl.Abort2({where: "MakeArgNumValidated", id: "noname-makefunc"})
	return JEEP.impl.MakeArgNumFunction(func, func.name, "<unknown>");
}

JEEP.impl.MakeArgTypeValidated = function(type, func)
{
	if(!func.name)
		JEEP.impl.Abort2({where: "MakeArgTypeValidated", id: "noname-makefunc"})
	let arginfo = JEEP.impl.GetArgTypeInfo("<unknown>", type);
	let arr = arginfo.arr;
	if(!JEEP.impl.Errors.Empty())
		JEEP.impl.Abort({noclass:true, where: "MakeArgTypeValidated", className: "<unknown>"})
	return JEEP.impl.MakeArgTypeFunction("<unknown>", func, func.name, arr, false);
}

JEEP.impl.ValidateObjName = function(where, name)
{
	if(!JEEP.impl.ValidateName(name))
		JEEP.impl.Abort2({where: where, id: "object-reg-name", idnames: {name: name.length?name:"<noname>"}});
}

JEEP.impl.ValidateObjectNotRegistered = function(where, name, type)
{
	if(JEEP.impl.ObjectDatabase.Get(name, type))
		JEEP.impl.Abort2({where: where, id: "object-registered", idnames: {type: type, name: name}});
}

JEEP.impl.GetUndecoratedName = function(name)
{
	// this is called only if '$' is at 0, so start from 1
	let pos = name.indexOf('$', 1);
	if(pos < 0)
		return null;
	if(name.length-pos < 3)
		return null;
	let dec = name.substr(1, pos-1);// get between the dollars
	while(++pos < name.length && name[pos] == '_');// start by skipping the dollar
	if(pos == name.length)
		return null;
	return {name: name.substr(pos), decoration: dec}
}

// returns {validVars: {}, getset: {}}
JEEP.impl.ProcessVarDesc = function(env, vars)
{
	let devmode = env.IsDevMode();
	let validVars = null, getset = null;
	
	let iter = JEEP.Utils.ObjectIterator.New(vars);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		if(typeof pair.value === 'function')
		{
			if(devmode)
				JEEP.impl.AddError("var-not-object", {type: "member", name: pair.key});
		}
		else
		{
			if(pair.key[0] == "$")
			{
				let undec = JEEP.impl.UndecorateName(env, pair.key, JEEP.impl.UNDECVAR);
				if(undec && (undec.type & (this.VAR_GETTER|this.VAR_SETTER)))
				{				
					getset = getset || {};
					getset[undec.name] = undec.type;
					pair.key = undec.name;
				}
			}
			let type = this.VT_POD;
			let v = pair.value;
			if(v !== null && v !== undefined)
			{
				if(Array.isArray(v) && v.length == 0)
					type = this.VT_EMPTYARRAY;
				else if(typeof v == "object")
					type = Object.keys(v).length == 0 ? this.VT_EMPTYOBJECT : this.VT_OBJECT;
			}
	     	validVars = validVars || {}
			validVars[pair.key] = {value: v, type: type};
 	  	}
	}
	return {validVars: validVars, getset: getset}
}

// returns {validFuncs: {}, typedFuncs: {}}
JEEP.impl.ProcessFuncDesc = function(env, funcs, noimpl)
{
	let devmode = env.IsDevMode();
	let validFuncs = null;
	let typedFuncs = ((env.flags & JEEP.impl.ENV_RETAIN_ARGTYPES) || env.IsDevMode()) ? {} : null;
	
	let iter = JEEP.Utils.ObjectIterator.New(funcs);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		if(pair.value === null)
		{
			if(devmode)
				JEEP.impl.AddError("func-set-null", {type: "member", name: pair.key});
		}
		else if(typeof pair.value !== 'function')
		{
			if(pair.key[0] == '$' && typeof pair.value == "string")
			{
				if(typedFuncs)// test this inside to allow type desc in production mode without retain-argtypes
				{	
					let fname = pair.key.substr(1);
					typedFuncs[fname] = this.GetArgTypeInfo(fname, pair.value);
				}
			}
			else if(devmode)
				JEEP.impl.AddError("func-not-function", {type: "member", name: pair.key});
		}
		else
		{
			let ftype = 0;
			if(pair.key[0] == "$")
			{
				let undec = JEEP.impl.UndecorateName(env, pair.key, JEEP.impl.UNDECFUNC);
				if(undec)
				{
					pair.key = undec.name;
					ftype = undec.type;
				}
			}
			validFuncs = validFuncs || {};
			validFuncs[pair.key] = {
				func: pair.value, 
				type: ftype, 
				empty: JEEP.impl.IsFunctionEmpty(pair.value)
			};
		}
	}

	if(devmode)
	{
		if(validFuncs)
		{
			iter.Reset(validFuncs);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				if(!pair.value.empty && (pair.value.type & JEEP.impl.FUNC_ABSTRACT))// not testing noimpl as abstract must always be empty
					JEEP.impl.AddError("func-not-empty", {type: "abstract", name: pair.key})
				if(noimpl && !pair.value.empty)
					JEEP.impl.AddError("func-not-empty", {type: "member", name: pair.key})
			}
		}
		if(typedFuncs)
		{
			validFuncs = validFuncs || {};
			iter.Reset(typedFuncs)
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				let f = validFuncs[pair.key]
				if(f === undefined)
					JEEP.impl.AddError("invalid-argtype-func", {func: pair.key})
				else if(f.func.length != pair.value.arr.length)
					JEEP.impl.AddError("invalid-argtype-decl-count", {func: pair.key, argcount: f.func.length, typecount: pair.value.arr.length})
			}
		}
	}
	return {validFuncs: validFuncs, typedFuncs: typedFuncs}
}

// returns {vars: {}, funcs: {}}, both same as result of ProcessXDesc
JEEP.impl.ProcessClubbedSpec = function(env, prop, noimpl)
{
	let vars = null, funcs = null;
	let iter = JEEP.Utils.ObjectIterator.New(prop);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		if(typeof pair.value !== 'function')
		{
			if(pair.key[0] == '$' && typeof pair.value == "string")
			{
				funcs = funcs || {}
				funcs[pair.key] = pair.value;
			}
			else
			{
				vars = vars || {}
				vars[pair.key] = pair.value;
			}
		}
		else
		{
			funcs = funcs || {}
			funcs[pair.key] = pair.value;
		}
	}
	let ret = {vars: null, funcs: null};
	if(vars)
		ret.vars = this.ProcessVarDesc(env, vars)
	if(funcs)
		ret.funcs = this.ProcessFuncDesc(env, funcs, noimpl)
	return ret;
}

JEEP.impl.Begin = function(env, spec)
{
	// provide default constructor
	spec.CONSTRUCTOR = spec.CONSTRUCTOR || function(){};

	let Class = JEEP.impl.GenerateConstructor(env, spec.CONSTRUCTOR);
	Class._jeepdef_ = spec._jeepdef_;
	Class._jeepdef_.CONSTRUCTOR = spec.CONSTRUCTOR;// mark the user given function for later use
	if(spec.DESTRUCTOR)
		Class._jeepdef_.DESTRUCTOR = spec.DESTRUCTOR;
	Class._jeepdef_.className = spec.name;
	if(spec.CrBaseClass)
		Class._jeepdef_.CrBaseClass = spec.CrBaseClass;
	if(spec.BaseClass)
		Class._jeepdef_.BaseClass = spec.BaseClass;
	if(spec.Variables)
		Class._jeepdef_.Variables = JEEP.impl.ProcessVarDesc(env, spec.Variables);
	if(spec.Functions)
	{
		let res = JEEP.impl.ProcessFuncDesc(env, spec.Functions)
		Class._jeepdef_.Functions = res.validFuncs
		Class._jeepdef_.TypedFunctions = res.typedFuncs;
	}
	if(spec.Static)
		Class._jeepdef_.Static = JEEP.impl.ProcessClubbedSpec(env, spec.Static);
	if(spec.Private)
		JEEP.impl.ProcessPrivateInfo(env, spec, Class);
	if(spec.Protected)
		JEEP.impl.ProcessProtectedInfo(env, spec, Class);
	return Class;
}

JEEP.impl.End = function(env, decl, ddMode, noAdd)
{
	let devmode = env.IsDevMode();

	// some initial validation
	if(!decl)
		JEEP.impl.Abort({where: "", reason: "No class definition given"});	

	// set the constructor and destructor
	decl.prototype.CONSTRUCTOR = decl._jeepdef_.CONSTRUCTOR;
	if(decl._jeepdef_.DESTRUCTOR)
		decl.prototype.DESTRUCTOR = decl._jeepdef_.DESTRUCTOR;

	// mark the name for general use
	decl.prototype.$name = decl._jeepdef_.className;
	decl.$name = decl._jeepdef_.className;// also add to decl itself for static access
	
	// setup reference to self, comes in handy for static access as well as cloning
	decl.prototype.$def = decl;
	
	// create instance _jeep_ object (whch is different from _jeepdef_)
	decl.prototype._jeep_ = {accessFlag: 0};
	
	let instVars = {};// instance variables, combines all from the hierarchy
	let getsetVars = null// variables that need getter and setter
	let overriddenInfo = {};// repeated function info
	let ddFuncMap = decl._jeepdef_.ddFuncMap ? {} : null;

	// setup static	
	if(decl._jeepdef_.Static)
	{
		if(decl._jeepdef_.Static.vars)
		{
			let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.Static.vars.validVars);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				decl[pair.key] = pair.value.value;
			}
		}

		if(decl._jeepdef_.Static.funcs)
		{
			let typedFuncs = decl._jeepdef_.Static.funcs.typedFuncs;
			let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.Static.funcs.validFuncs);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				let f = pair.value.func;
				let plainf = f;// as opposed to special
				let type = pair.value.type;
				let ty = "";
				if(type & JEEP.impl.FUNC_VIRTUAL)
					ty = type & JEEP.impl.FUNC_REPLACE?"virtual and replace":"virtual";
				if(type & JEEP.impl.FUNC_ABSTRACT)
					ty = "abstract"
				if(type & JEEP.impl.FUNC_CONSTANT)
					ty = "constant"
				if(ty)
					JEEP.impl.AddError("func-invalid-type", {name: pair.key, which: "static", type: ty})
				else if(type & (JEEP.impl.FUNC_SCOPED|JEEP.impl.FUNC_ARGNUM|JEEP.impl.FUNC_ARGCONST))
					f = this.CreateSpecialFunctions(env, null, f, pair.key, type, false);
				let argtype = "";
				if(typedFuncs)
				{
					let ti = typedFuncs[pair.key];
					if(ti)
					{
						argtype = ti.type;
						f = this.MakeArgTypeFunction(decl._jeepdef_.className, f, pair.key, ti.arr)
					}
				}
				decl[pair.key] = f.bind(decl);
				if((env.flags == JEEP.impl.ENV_DEVMODE) && ddFuncMap)// disambiguate name with a dollar as the same map is used for member functions
					ddFuncMap["$"+pair.key] = {type: JEEP.impl.FUNC_STATIC, argcount: plainf.length, argtype: argtype};
			}
		}
	}
	
	// create scoped creator as a static function only if destructor is defined
	if(decl._jeepdef_.DESTRUCTOR)
	{
		decl.ScopedCreate = function(){
			if(!JEEP.impl.ScopeStack.IsMarked())
				JEEP.impl.Abort({runtime: true, reason: "ScopedCreate can only be used inside a scoped function", className: decl._jeepdef_.className})
			let obj = new decl([].slice.call(arguments));
			JEEP.impl.ScopeStack.Add(obj);
			return obj;
		}
	}
	
	if(decl._jeepdef_.Variables)
	{
		if(devmode && decl._jeepdef_.Variables.validVars)
		{
			let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.Variables.validVars);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				if(decl._jeepdef_.prot && decl._jeepdef_.prot.vars)
				{
					if(decl._jeepdef_.prot.vars.validVars[pair.key] !== undefined)
						JEEP.impl.AddError("prot-pub", {what: "variable", name: pair.key})
				}
			}
		}
		getsetVars = decl._jeepdef_.Variables.getset;
	}

	let baseRet = JEEP.impl.ProcessBases(env, decl, instVars, overriddenInfo);		
	
	JEEP.impl.ProcessMemFuncs(env, decl, baseRet.baseArr, {
		getsetVars: getsetVars,
		overriddenInfo: overriddenInfo, 
		ddFuncMap: ddFuncMap,
		ddMode: ddMode,
		dupFuncs: baseRet.dupFuncs,
		dupVirtFuncs: baseRet.dupVirtFuncs,
	});
	
	if(decl._jeepdef_.Variables && decl._jeepdef_.Variables.validVars)
		JEEP.Utils.Merge(decl._jeepdef_.Variables.validVars, instVars)

	// setup the $base object if needed
	let rfobj = JEEP.Utils.ObjectIterator.New(overriddenInfo);
	if(rfobj.Total() > 0)
	{
		let baseClass = {};
		while(rfobj.GetNext())
		{
			let pair = rfobj.GetCurrPair();
			let info = pair.value;
			let base = {_jeep_: {}};
			baseClass[info.base.$name] = base;
			// the function is stored in _jeep_; will be rebased and added to base during instantiation
			for(let f = 0; f<info.arr.length; f++)
				base._jeep_[info.arr[f].name] = info.arr[f].func;
			// add the marked virtual function of the base if any
			if(info.base._jeep_.vtable)
			{
				let viter = JEEP.Utils.ObjectIterator.New(info.base._jeep_.vtable);
				while(viter.GetNext())
				{
					let pair = viter.GetCurrPair();
					// the derived is actually the original of the base; it's derived from its
					// own point of view wrt its own base class
					base._jeep_[pair.key] = pair.value.ownVF;
				}
			}
		}
		decl.prototype.$base = baseClass;
	}
	
	// flatten the hierarchy for ancestor access if specified
	if(decl.prototype.$base && (decl._jeepdef_.flags & this.CLASS_ANCESTORACCESS))
	{
		for(let k = 0; k<decl.prototype._jeep_.flatBaseArr.length; k++)
		{
			let base = decl.prototype._jeep_.flatBaseArr[k];
			if(!base.$base)
				continue;
			let bobj = JEEP.Utils.ObjectIterator.New(base.$base);
			while(bobj.GetNext())
				decl.prototype.$base[bobj.GetCurrKey()] = bobj.GetCurrValue();
		}
	}

	if((env.flags == JEEP.impl.ENV_DEVMODE))
	{
		if(baseRet.dupFuncs)
			baseRet.dupFuncs.GenerateError();
		if(baseRet.dupVirtFuncs)
			baseRet.dupVirtFuncs.GenerateError();
	}

	if(decl._jeepdef_.flags & this.CLASS_INTERNALVARCHANGE)
	{
		decl.prototype._jeep_.accessFlag |= this.ACC_INTERNALVARCHANGE;
		decl.prototype.ExternalCall = function(func)
		{
			let args = [env].concat(Array.prototype.slice.call(arguments,0));
			return JEEP.impl.ExternalCall.apply(this, args)
		}
	}

	// mark the variables for instantiation
	decl.prototype._jeep_.vars = instVars;

	JEEP.impl.SetupDef(decl)

	if(noAdd)
		return decl;

	// add to the class map
	JEEP.impl.ObjectDatabase.Add(decl, decl._jeepdef_.className, "class");
	
	// done
}

JEEP.impl.ExternalCall = function(env, func)
{
	if((env.flags == JEEP.impl.ENV_DEVMODE))
	{
		if(typeof func !== 'function')
			JEEP.impl.Abort({reason: "ExternalCall expects a function as the first argument", className: decl._jeepdef_.className})
	}
	let ex = null;
	let acc = 0;
	if(this._jeepsentinel_)
	{
		acc = this._jeepsentinel_.accessFlag;
		this._jeepsentinel_.accessFlag |= JEEP.impl.ACC_INTERNALVARCHANGE;
	}
	let args = Array.prototype.slice.call(arguments,2);// ignore func and env
	let ret = undefined;
	try{ret = func.apply(null, args)}catch(e){ex=e}
	if(this._jeepsentinel_)
		this._jeepsentinel_.accessFlag = acc;
	if(ex)
		throw ex;
	return ret;
}

JEEP.impl.GetSentinelFlags = function(inst)
{
	let pubSentinel = inst._jeepsentinel_;
	let protSentinel = inst.$ ? inst.$._jeepsentinel_ : null;
	let privSentinel = inst.$$ ? inst.$$._jeepsentinel_ : null;
	return {
		orig: {
			pub: pubSentinel.accessFlag, 
			prot: protSentinel ? protSentinel.accessFlag : 0,
			priv: privSentinel ? privSentinel.accessFlag : 0
		},
		copy: {
			pub: pubSentinel.accessFlag, 
			prot: protSentinel ? protSentinel.accessFlag : 0,
			priv: privSentinel ? privSentinel.accessFlag : 0
		}
	}
}

JEEP.impl.ResetSentinel = function(inst, flags, cfname)
{
	let pubSentinel = inst._jeepsentinel_;
	let protSentinel = inst.$ ? inst.$._jeepsentinel_ : null;
	let privSentinel = inst.$$ ? inst.$$._jeepsentinel_ : null;
	if(pubSentinel)
	{
		pubSentinel.accessFlag = flags.pub;
		if(cfname !== undefined)
			pubSentinel.constFuncName = cfname;
	}
	if(protSentinel)
	{
		protSentinel.accessFlag = flags.prot;
		if(cfname !== undefined)
			protSentinel.constFuncName = cfname;
	}
	if(privSentinel)
	{
		privSentinel.accessFlag = flags.priv;
		if(cfname !== undefined)
			privSentinel.constFuncName = cfname;
	}
}

JEEP.impl.MakeConstantFunction = function(func, fname, useRebasedFuncs)
{
	return function(){
	    let res = JEEP.impl.GetSentinelFlags(this)
		res.copy.pub |= JEEP.impl.ACC_CONSTFUNC;
		res.copy.prot |= JEEP.impl.ACC_CONSTFUNC;
		res.copy.priv |= JEEP.impl.ACC_CONSTFUNC;
		JEEP.impl.ResetSentinel(this, res.copy, fname)
		let ex = null;
		let ret = null;
		if(useRebasedFuncs)
			func = this.$$.rebasedFuncs[fname];
		try{ret = func.apply(this, arguments)}catch(e){ex=e}
		JEEP.impl.ResetSentinel(this, res.orig, "")
		if(ex)
			throw ex;
		return ret;
	}
}

JEEP.impl.MakeNonConstantFunction = function(func, fname, useRebasedFuncs, privLevel)
{
	return function(){
	    let res = JEEP.impl.GetSentinelFlags(this)
		if(!(res.copy.pub & JEEP.impl.ACC_CONSTFUNC))// not part of the call chain of a constant function
			res.copy.pub = 0;
		if(!(res.copy.prot & JEEP.impl.ACC_CONSTFUNC))
			res.copy.prot = 0;
		if(!(res.copy.priv & JEEP.impl.ACC_CONSTFUNC))
			res.copy.priv = 0;
		JEEP.impl.ResetSentinel(this, res.copy)
		let ex = null;
		let ret = null;
		if(useRebasedFuncs)
			func = this.$$.rebasedFuncs[fname];
		try{ret = func.apply(this, arguments)}catch(e){ex=e}
		JEEP.impl.ResetSentinel(this, res.orig)
		if(ex)
			throw ex;
		return ret;
	}
}

JEEP.impl.MakeScopedFunction = function(func, fname, useRebasedFuncs)
{
	return function(){
		JEEP.impl.ScopeStack.Mark();
		let ret = undefined;
		let ex = null;
		if(useRebasedFuncs)
			func = this.$$.rebasedFuncs[fname];
		try{ret = func.apply(this, arguments)}catch(e){ex=e}
		JEEP.impl.ScopeStack.Unwind();
		if(ex)
			throw ex;
		return ret;
	}
}

JEEP.impl.MakeArgConstFunction = function(func, fname, useRebasedFuncs)
{
	return function(){
		let args = [];
		for(let k = 0; k<arguments.length; k++)
		{
			let a = arguments[k];
			if(a !== null && a !== undefined && typeof a === 'object')
				a = JEEP.Utils.DeepClone(a);
			args.push(a);
		}
		let ret = undefined;
		let ex = null;
		if(useRebasedFuncs)
			func = this.$$.rebasedFuncs[fname];
		try{ret = func.apply(this, args)}catch(e){ex=e}
		if(ex)
			throw ex;
		return ret;
	}
}

JEEP.impl.MakeArgNumFunction = function(func, fname, className, useRebasedFuncs)
{
	let declNum = func.length;
	return function(a){// single arg for the sake of setter, it can;t be made special func (a small hack)
		if(declNum != arguments.length)
			JEEP.impl.Abort({runtime: true, reason: "The function '" +fname+ "' is declared to take " +declNum+ " arguments but invoked with " +arguments.length, className: className || this.$name});
		let ex = null;
		if(useRebasedFuncs)
			func = this.$$.rebasedFuncs[fname];
		try{ret = func.apply(this, arguments)}catch(e){ex=e}
		if(ex)
			throw ex;
		return ret;
	}
}

JEEP.impl.MakeArgTypeFunction = function(className, func, fname, typeInfo, useRebasedFuncs)
{
	return function(){
		for(let k = 0; k<typeInfo.length; k++)
		{
			let ty = typeInfo[k]
			if(ty.pos >= arguments.length)
				JEEP.impl.Abort({runtime: true, className: className, id: "invalid-argtype-count", idnames: {func: fname, count: typeInfo.length}});
			if(ty.type.length == 0)// means no validation
				continue;
			let errid = "invalid-argtype"
			let ob = arguments[ty.pos]
			let match = true;
			if(ob && ty.jeepObjectType)
			{
				let JOb = JEEP.impl.ObjectDatabase.Get(ty.type, ty.jeepObjectType);
				match = JOb && JOb.InstanceOf(ob)
				if(!JOb && !match)
					errid = "invalid-argtype-jobj"
			}
			else
			{
				let isarr = ty.type == "array";
				match = !(ob == null || (isarr && !Array.isArray(ob)) || (!isarr && typeof ob !== ty.type))
			}
			if(!match)
				JEEP.impl.Abort({runtime: true, className: className, id: errid, idnames: {
					func: fname, argpos: ty.pos, type: ty.jeepObjectType ? ty.jeepObjectType+" " +ty.type:ty.type
				}});
		}
		let ex = null;
		if(useRebasedFuncs)
			func = this.$$.rebasedFuncs[fname];
		try{ret = func.apply(this, arguments)}catch(e){ex=e}
		if(ex)
			throw ex;
		return ret;
	}
}

JEEP.impl.ValidateNamespaceName = function(env, name)
{
	if((env.flags == JEEP.impl.ENV_DEVMODE))
	{
		if(!JEEP.impl.ValidateName(name))
			JEEP.impl.Abort({type: "namespace", where: "CreateNamespace", reason: "The name must be a valid name separated by dots (and dots must not be the first or the last character)", className: name});
	}
}

JEEP.impl.ProcessPrivateInfo = function(env, spec, decl)
{
	let pi = this.ProcessClubbedSpec(env, spec.Private);
	let rebasedFuncs = {};
	if(pi.funcs && pi.funcs.validFuncs)
	{
		let typedFuncs = pi.funcs.typedFuncs;
		let iter = JEEP.Utils.ObjectIterator.New(pi.funcs.validFuncs);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			let ty = "";
			if(pair.value.type & JEEP.impl.FUNC_VIRTUAL)
				ty = pair.value.type & JEEP.impl.FUNC_REPLACE?"virtual and replace":"virtual";
			if(pair.value.type & JEEP.impl.FUNC_ABSTRACT)
				ty = "abstract";
			if(ty)
				JEEP.impl.AddError("func-invalid-type", {name: pair.key, which: "private", type: ty})
			let sf = this.CreateSpecialFunctions(env, spec, pair.value.func, pair.key, pair.value.type, true);
			if(sf != pair.value.func)
			{
				rebasedFuncs[pair.key] = pair.value.func;
				pair.value.func = sf;
			}
			if(typedFuncs)
			{
				let ti = typedFuncs[pair.key];
				if(ti)
					pair.value.func = this.MakeArgTypeFunction(decl._jeepdef_.className, pair.value.func, pair.key, ti.arr)
			}
		}
	}
	decl = decl || spec;
	decl._jeepdef_.priv = {
		funcs: pi.funcs, 
		vars: pi.vars && pi.vars.validVars ? pi.vars.validVars : null, 
		users: {}, 
		rebasedFuncs: rebasedFuncs
	};
}

JEEP.impl.ProcessProtectedInfo = function(env, spec, decl)
{
	let pi = this.ProcessClubbedSpec(env, spec.Protected);
	if(pi.funcs && pi.funcs.validFuncs)
	{
		let typedFuncs = pi.funcs.typedFuncs;
		let iter = JEEP.Utils.ObjectIterator.New(pi.funcs.validFuncs);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			let sf = this.CreateSpecialFunctions(env, spec, pair.value.func, pair.key, pair.value.type);
			if(sf != pair.value.func)
				pair.value.func = sf;
			if(typedFuncs)
			{
				let ti = typedFuncs[pair.key];
				if(ti)
					pair.value.func = this.MakeArgTypeFunction(decl._jeepdef_.className, pair.value.func, pair.key, ti.arr)
			}
		}
	}
	if(pi.vars && pi.vars.getset)
		JEEP.impl.AddError("prot-var-getset")
	decl = decl || spec;
	decl._jeepdef_.prot = pi;
}

JEEP.impl.ValidateName = function(name)
{
	if(typeof name !== 'string' || name.length == 0)
		return false;
	let p = name.indexOf('.');
	if(p < 0)
		return this.IsValidName(name);
	let nm = name;
	while(true)
	{
		let pref = nm.substring(0, p);
		if(pref.length == 0)// dot at the end
			return false;
		if(!this.IsValidName(pref))
			return false;
		nm = nm.substr(++p);
		let q = nm.indexOf(".");
		if(q == 0)// dots in a row
			return false;
		if(q < 0)
			break;
		p = q;
	}
	return nm.length == 0 ? false : this.IsValidName(nm);
}

JEEP.impl.IsValidName = function(name)
{
	let c = name[0];
	if(!((c >= 'a' && c <= 'z')||(c >= 'A' && c <= 'Z')))
		return false;
	for(let k = 1; k<name.length; k++)
	{
		c = name[k];
		if(c=='_'||(c >= 'a' && c <= 'z')||(c >= 'A' && c <= 'Z')||(c >= '0' && c <= '9'))
			continue;
		return false;
	}
	return true;
}

JEEP.impl.GetJeepObjArgInfo = function(arg)
{
	let i = 0;
	i = arg.indexOf("class.");
	if(i >= 0)
		return {type: "class", arg: arg.substr(i+"class.".length)}
	i = arg.indexOf("struct.");
	if(i >= 0)
		return {type: "struct", arg: arg.substr(i+"struct.".length)}
	i = arg.indexOf("record.");
	if(i >= 0)
		return {type: "record", arg: arg.substr(i+"record.".length)}
	return null;
}

JEEP.impl.GetArgType = function(arg)
{
	switch(arg){
		case "?": return JEEP.impl.ArgTypeRecord.New();
		case "Object": return JEEP.impl.ArgTypeRecord.New({type:"object"});
		case "Array": return JEEP.impl.ArgTypeRecord.New({type:"array"});;
		case "Number": return JEEP.impl.ArgTypeRecord.New({type:"number"});;
		case "String": return JEEP.impl.ArgTypeRecord.New({type:"string"});;
	}
	if(!this.ValidateName(arg))
		return null;
	let jarg = this.GetJeepObjArgInfo(arg);
	if(!jarg)
		return null;
	return JEEP.impl.ArgTypeRecord.New({type: jarg.arg, jeepObjectType: jarg.type})
}

JEEP.impl.GetArgTypeInfo = function(fname, argdesc)
{
	let types = [];
	let ty = null;
	let argarr = [];
	let pos = 0;
	while(ty = this.rxFuncArg.exec(argdesc))
	{
		types.push(ty[1]);
		let rt = JEEP.impl.GetArgType(ty[1])
		if(rt)
		{
			rt.pos = pos;
			argarr.push(rt)
		}
		else
			JEEP.impl.AddError("invalid-argtype-decl", {type: ty[1], func: fname, argpos: pos})
		pos++;
	}
	return {arr: argarr, type: types.join(",")};
}

JEEP.impl.ProcessClassSpec = function(info)
{
	let devmode = info.env.IsDevMode();

	if(devmode)
	{
		let iter = JEEP.Utils.ObjectIterator.New(info.spec);
		while(iter.GetNext())
		{
			let key = iter.GetCurrKey();
			if(key == "_jeepdef_")
				continue;
			if(JEEP.impl.DeclarationProperties.indexOf(key) < 0)
				JEEP.impl.AddError("invalid-class-desc", {name: iter.GetCurrKey()});
		}
	}

	if(devmode && info.spec.CrBaseClass)
	{
		for(let k = 0; k<info.spec.CrBaseClass.length; k++)
		{
			let base = info.spec.CrBaseClass[k];
			if(base._jeepdef_ === undefined)
				JEEP.impl.Abort({reason: "Only JEEP generated classes can be used in CrBaseClass", className: info.name, where: info.where})
		}
	}

	info.spec._jeepdef_ = {flags: 0};
	
	if(info.spec.Flags)
	{
		let res = JEEP.impl.ClassFlags.Process({markError: devmode, flags: info.spec.Flags});
		if(devmode)
		{
			for(let k = 0; k<res.errors.length; k++)
				JEEP.impl.AddError("invalid-flags", {which: res.errors[k]});
			if((res.flags & this.CLASS_MANUALBASECTOR) && !(info.spec.BaseClass||info.spec.CrBaseClass))
				JEEP.impl.AddError("manual-base-construction");
		}
		info.spec._jeepdef_.flags = res.flags;		
	}

	if(devmode && !info.spec.Private && (info.spec._jeepdef_.flags & JEEP.impl.CLASS_USINGPRIVATE))
		JEEP.impl.Abort({where: info.where, id: "private-non-existing", className: info.name})
}

JEEP.impl.IsFunctionEmpty = function(f)
{
	// note that the syntax is validated by the browser; here only the emptiness is checked
	return this.rxEmptyfunction.test(f.toString());
}

JEEP.impl.ShallowClone = function(src, clone)
{	
	let isArray = Array.isArray(src);
	clone = clone || (isArray ? [] : {});
	if(isArray)
		clone = Array.from(src)
	else
	{
		// Use plain method as we don't know ho large the object is going to be.
		// Why affect performance for the vanity of dogfooding with a known slower solition?
		let keys = Object.keys(src)
		for(let k = 0; k<keys.length; k++)
			clone[keys[k]] = src[keys[k]]
	}
	return clone;
}

JEEP.impl.ShallowCloneClass = function(src, ctor)
{
	let clone = ctor ? ctor : function(){return src.apply(this, arguments)};
	clone = JEEP.impl.ShallowClone(src, clone);
	let robj = JEEP.Utils.ObjectIterator.New(src.prototype);
	while(robj.GetNext())
	{
		let pair = robj.GetCurrPair();
		clone.prototype[pair.key] = pair.value;
	}
	return clone;
}

JEEP.impl.AddDecl = function(decl)
{
	if(JEEP.impl.ObjectDatabase.Get(decl._jeepdef_.className, "class"))
		JEEP.impl.Abort({where: "JEEP.DeclareClass", reason: "The class already exists", className: decl._jeepdef_.className});
	if(JEEP.impl.ObjectDatabase.Get(decl._jeepdef_.className, "decl"))
		JEEP.impl.Abort({where: "JEEP.DeclareClass", reason: "The class is already declared", className: decl._jeepdef_.className});
	JEEP.impl.ObjectDatabase.Add(decl, decl._jeepdef_.className, "decl");
}

JEEP.impl.GetDecl = function(name)
{
	let decl = JEEP.impl.ObjectDatabase.Get(name, "decl");
	if(decl === undefined)
		JEEP.impl.Abort({where: "JEEP.DeclareClass", reason: "The class cannot be defined as it is not declared", className: name});
	JEEP.impl.ObjectDatabase.Delete(name, "decl");
	return decl;
}

JEEP.impl.CreateCopyProps = function(srcObj, destObj, names)
{
	for (let j = 0; j < names.length; j++)
	{
		let n = names[j];
		if(srcObj[n])
		{
			destObj[n] = destObj[n] || {};
			JEEP.Utils.CopyProps(srcObj[n], destObj[n], Object.keys(srcObj[n]))
		}
	}
}

JEEP.impl.UndecorateName = function(env, given, type, extra)
{
	let undec = JEEP.impl.GetUndecoratedName(given)
	if(!undec)
		return null;

	let flagStr = undec.decoration.split('_').join(",");// since FlagProcessor expects comma separated string
	let name = undec.name;

	let dirproc = null;
	let undecType = "";
	switch(type)
	{
		case JEEP.impl.UNDECFUNC: dirproc = JEEP.impl.FuncDirectives; undecType = "function"; break;
		case JEEP.impl.UNDECVAR: dirproc = JEEP.impl.VarDirectives; undecType = "variable"; break;
	}
		
	let res = dirproc.Process({markError: env.flags == JEEP.impl.ENV_DEVMODE, flags: flagStr});
	
	if(env.flags == JEEP.impl.ENV_DEVMODE)
	{		
		for(let k = 0; k<res.errors.length; k++)
			JEEP.impl.AddError("invalid-directive", {name: name, type: undecType, which: res.errors[k]});
		JEEP.impl.ValidateDecoratedDirectives(res.flags, type, name, extra);	
	}

	return res.errors.length > 0 ? null : {name: name, type: res.flags};
}

JEEP.impl.ValidateDecoratedDirectives = function(flags, type, name, extra)
{
	switch(type)
	{
	case JEEP.impl.UNDECFUNC:
		if((flags & JEEP.impl.FUNC_VIRTUAL) && (flags & JEEP.impl.FUNC_ABSTRACT))
			JEEP.impl.AddError("func-virtual-abstract", {name: name});
		if((flags & JEEP.impl.FUNC_IMPL_DIRECTIVES) && (flags & JEEP.impl.FUNC_ABSTRACT))
			JEEP.impl.AddError("abstract-directives", {name: name});
		if(!(flags & JEEP.impl.FUNC_VIRTUAL) && (flags & JEEP.impl.FUNC_REPLACE))
			JEEP.impl.AddError("func-invalid-replace", {name: name});
		break;
	case JEEP.impl.UNDECVAR:
		if(!(flags & (this.VAR_GETTER|this.VAR_SETTER)))
			JEEP.impl.AddError("var-invalid-directives", {name: name});
		break;
	}
}

JEEP.impl.GetDecorationName = function(type)
{
	let name = [];
	let obj = JEEP.Utils.ObjectIterator.New(JEEP.impl.FuncDirectivesMap);
	while(obj.GetNext())
	{
		let pair = obj.GetCurrPair();
		if(type & pair.value)
			name .push(pair.key);
	}
	return name.length == 0 ? "<no directives>":""+name.sort().join('_')+"";
}

JEEP.impl.MarkOverrides = function(dest, base, name, func)
{
	let info = dest[base.$name];
	if(info === undefined)
		info = {base: base, arr: [{name: name, func: func}]};
	else
		info.arr.push({name: name, func: func});
	dest[base.$name] = info;
}

JEEP.impl.GenerateConstructor = function(env, CONSTRUCTOR)
{
	return function() 
	{
		let inst = this;
		
		if(!this._jeep_)
			JEEP.impl.Abort({where: "instantiation", reason: "Non _jeep_ class bound to the constructor", className: "<unknown>"});		
		
		// check the instantiability
		if(((env.flags == JEEP.impl.ENV_DEVMODE) || (env.flags & JEEP.impl.ENV_RETAIN_ABSCHECK)) && this._jeep_.vtable)
		{
			let errorList = JEEP.impl.ErrorList.New();
			let iter = JEEP.Utils.ObjectIterator.New(this._jeep_.vtable);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				if(pair.value.type & JEEP.impl.FUNC_ABSTRACT)
				{
					// re abstraction is latest change, so has higher priority
					if(pair.value.reinfOrig)
					{
						if(pair.value.reinfOrig != this.$name)
							JEEP.impl.AddError("reinf-abstract-not-implemented", {func: pair.key, base: pair.value.orig, reinf: pair.value.reinfOrig})
						else
							JEEP.impl.AddError("own-reinf-abstract-not-implemented", {func: pair.key, base: pair.value.orig})
					}
					else if(pair.value.orig != this.$name)
						JEEP.impl.AddError("base-abstract-not-implemented", {func: pair.key, base: pair.value.orig})
					else
						JEEP.impl.AddError("own-abstract-not-implemented", {func: pair.key})
				}
			}
			if(!JEEP.impl.Errors.Empty())
				JEEP.impl.Abort({runtime: true, reason: "Instantiation failed due to unimplemented abstract functions", className: this.$name});
		}			

		// try copy construction when **exactly** one argument is found
		if(arguments.length == 1)
		{
			let copy = arguments[0];
			if(copy && copy._jeep_ && copy.$name == this.$name)
			{
				JEEP.impl.RunCopyConstructor(copy, this);
				return;
			}
		}

		// create variables
		if(this._jeep_.vars)
		{
			JEEP.impl.CreateInstanceVariables({
				env: env,
				vars: this._jeep_.vars, 
				inst: this,
				loc: this,
	//			restrictedAccess: restrictedAccess,
				flag: JEEP.impl.ACC_CONSTFUNC|JEEP.impl.ACC_INTERNALVARCHANGE,
				privilage: "public",
			})
		}
		
		// try setting vars if valid (after vars are setup)
		let initCtor = false;
		if(arguments.length == 2)
		{
			let init = JEEP.impl.GetInitNewInfo(arguments)
			if(init)
			{
				JEEP.impl.RunInitConstructor(env, init, this)
				initCtor = true;
			}
		}
		
		// rebase the original base functions (add virtual overrides after constructors are called)
		if(this.$base)
		{
			// every instance must have its own $base that has functions rebased to itself
			let ownBaseClass = {};
			let instProto = Object.getPrototypeOf(this);
			let bobj = JEEP.Utils.ObjectIterator.New(this.$base);
			while(bobj.GetNext())
			{
				let pair = bobj.GetCurrPair();
				let base = pair.value;
				let pobj = JEEP.Utils.ObjectIterator.New(base._jeep_);
				base = {};
				while(pobj.GetNext())
				{
					let pair = pobj.GetCurrPair();
					if(pair.key[0] == '_')
						continue;
					base[pair.key] = function(){return pair.value.apply(inst, arguments);};
				}
				ownBaseClass[pair.key] = base;
			}
			// Note that the original was accessed from the prototype but due to JavaScript magic, 
			// this assigns to the instance rather than back to the prototype.
			this.$base = ownBaseClass;
		}	
		
		// setup the destructor if necessary
		if(this.DESTRUCTOR)
		{
			// Note that the own is assigned to the one in the prototype which is the user supplied one 
			// but the reassignment happens to the instance object rather than back to the prototype.
			let own = this.DESTRUCTOR;
			this.DESTRUCTOR = function(){
				JEEP.impl.EnablePolymorphism(false, this, "destructor");
				// reverse order of creation - first the instance and then its bases in reverse
				own.apply(inst);
				if(inst._jeep_.flatBaseArr)
				{
					for(let k = inst._jeep_.flatBaseArr.length-1; k >= 0; k--)
					{
						let d = inst._jeep_.flatBaseArr[k].DESTRUCTOR;
						if(d)
							try{d.apply(inst)}catch(e){}
					}
				}
				JEEP.impl.EnablePolymorphism(true, this);
			}
		}		

		// setup private and protected members
		let ctorArray = [];
		let enforceProtected = (env.flags == JEEP.impl.ENV_DEVMODE) || (env.flags & JEEP.impl.ENV_RETAIN_PROTECTED)
		if(this._jeep_.flatBaseArr)
		{
			for(let k = 0; k<this._jeep_.flatBaseArr.length; k++)
			{
				let base = this._jeep_.flatBaseArr[k];
				let ctor = this._jeep_.flatBaseArr[k].CONSTRUCTOR;
				if(base.$def._jeepdef_.prot)
					JEEP.impl.InstantiateProtectedMembers(env, base.$def, this, enforceProtected);
				if(base.$def._jeepdef_.priv)
					ctor = JEEP.impl.InstantiatePrivateMembers(env, base.$def, this);
				ctorArray.push({CONSTRUCTOR: ctor, name: base.$name});
			}
		}
		let ownCtor = this.$def.prototype.CONSTRUCTOR;
		if(this.$def._jeepdef_.prot)
			JEEP.impl.InstantiateProtectedMembers(env, this.$def, this, enforceProtected);
		if(this.$def._jeepdef_.priv)
			ownCtor = JEEP.impl.InstantiatePrivateMembers(env, this.$def, this);

		// Now the instance is ready to be 'constructed'.
		JEEP.impl.InvokeConstructors(env, this, ctorArray, ownCtor, initCtor ? [] : arguments);
	}
}

JEEP.impl.EnablePolymorphism = function(enable, inst, where)
{
	if(!inst._jeep_.vtable)
		return;
	inst._jeep_.polymorphismBlockedDueTo = enable ? "" : where;
	let instProto = Object.getPrototypeOf(inst);
	let iter = JEEP.Utils.ObjectIterator.New(inst._jeep_.vtable);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		let target = pair.value.type & JEEP.impl.FUNC_PROTECTED ? inst.$ : instProto;
		target[pair.key] = enable ? pair.value.ownVF : pair.value.baseVF;
	}
}

JEEP.impl.FlattenBaseArray = function(base, flatBaseArr)
{
	if(base._jeep_.flatBaseArr)
	{
		for(let k = 0; k<base._jeep_.flatBaseArr.length; k++)
			JEEP.impl.FlattenBaseArray(base._jeep_.flatBaseArr[k], flatBaseArr);
	}
	if(flatBaseArr.indexOf(base) < 0)
		flatBaseArr.push(base);
}

JEEP.impl.CreateGetterSetter = function(info)
{
	let vname = info.vname[0].toUpperCase() + info.vname.substr(1);
	let ret = {};
	let t = info.thisObj;
	if(info.flag & JEEP.impl.VAR_GETTER)
	{
		let n = "Get"+vname;
		let f = info.def.prototype[n];
		if(f !== undefined)
			JEEP.impl.AddError("getter-setter-present", {name: info.vname, which: n, type: "getter"});
		else if(info.protFuncs && info.protFuncs[n] !== undefined)
			JEEP.impl.AddError("prot-pub", {what: "function", name: n})
		else
		{
			ret.getter = function(){return this[info.vname]};// use original name
			ret.getter._jeepowner_ = info.def;
			ret.getterName = n;
			info.def.prototype[n] = ret.getter;// use uppercased name
		}
	}
	if(info.flag & JEEP.impl.VAR_SETTER)
	{
		let n = "Set"+vname;
		let f = info.def.prototype[n];
		if(f !== undefined)
			JEEP.impl.AddError("getter-setter-present", {name: info.vname, which: n, type: "setter"});
		else if(info.protFuncs && info.protFuncs[n] !== undefined)
			JEEP.impl.AddError("prot-pub", {what: "function", name: n})
		else
		{
			ret.setter = function(v){this[info.vname]=v};// use original name
			// make argnum before others so that arg count is preserved as 1
			ret.setter = JEEP.impl.MakeArgNumFunction(ret.setter, n);
			if(info.def._jeepdef_.flags & JEEP.impl.CLASS_INTERNALVARCHANGE)
				ret.setter = JEEP.impl.MakeNonConstantFunction(ret.setter);
			ret.setter._jeepowner_ = info.def;
			ret.setterName = n;
			info.def.prototype[n] = ret.setter;
		}
	}
	return JEEP.impl.Errors.Empty() ? ret : null;
}

JEEP.impl.ProcessBases = function(env, decl, instVars, overriddenInfo)
{
	let devmode = env.flags == JEEP.impl.ENV_DEVMODE;
	let baseArr = [];
	let dupFuncs = null;
	let dupVirtFuncs = null;
	
	if(decl._jeepdef_.CrBaseClass)
	{
		for(let k = 0; k<decl._jeepdef_.CrBaseClass.length; k++)
			baseArr.push(decl._jeepdef_.CrBaseClass[k].prototype)
	}

	if(decl._jeepdef_.BaseClass && decl._jeepdef_.BaseClass.length > 0)
	{
		var baseNames = decl._jeepdef_.BaseClass.split(",").map(function(item){return item.trim();});
		for(let k = 0; k<baseNames.length; k++)
		{
			try{baseArr.push(JEEP.GetClass(baseNames[k]).prototype)}
			catch(e){JEEP.impl.Abort({where: "JEEP", reason: "Invalid base class name given", className: name})}
		}
	}

	if(baseArr.length > 0)
	{
		// flatten the hierarchy for quick linear access to bases and store it
		let flatBaseArr = [];
		for(let k = 0; k<baseArr.length; k++)
			JEEP.impl.FlattenBaseArray(baseArr[k], flatBaseArr);
		decl.prototype._jeep_.flatBaseArr = flatBaseArr;

		let dupVars = null;
		let vtable = {};
		let varmap = {};

		if(devmode)
		{
			dupVirtFuncs = JEEP.impl.DuplicateDetector.New('virtual function');
			dupVars = JEEP.impl.DuplicateDetector.New('variable');	
			dupFuncs = JEEP.impl.DuplicateDetector.New('function');

			if(decl._jeepdef_.prot)
			{
				if(decl._jeepdef_.prot.funcs)
				{
					let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.prot.funcs.validFuncs);
					while(iter.GetNext())
					{
						let pair = iter.GetCurrPair();
						if(!(pair.value.type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT)))
							dupFuncs.Add(pair.key, decl.$name);
					}
				}
				if(decl._jeepdef_.prot.vars)
				{
					let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.prot.vars.validVars);
					while(iter.GetNext())
					{
						let pair = iter.GetCurrPair();
						dupVars.Add(pair.key, decl.$name);
					}
				}
			}

			if(decl._jeepdef_.Variables && decl._jeepdef_.Variables.validVars)
			{
				let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.Variables.validVars);
				while(iter.GetNext())
				{
					let pair = iter.GetCurrPair();
					dupVars.Add(pair.key, decl._jeepdef_.className);
				}
			}
		}
		
		// validate that no base is base of any other base
		if(devmode)
		{
			for(let j = 0; j<baseArr.length; j++)
			{
				let base = baseArr[j];
				if(!base._jeep_ || !base._jeep_.flatBaseArr)
					continue;
				for(let q = 0; q<baseArr.length; q++)
				{
					if(q == j)
						continue;
					if(base._jeep_.flatBaseArr.indexOf(baseArr[q]) >= 0)
						JEEP.impl.AddError("base-base-of-base", {parent:  baseArr[q].$name, child: base.$name});
				}
			}
		}

		// Mark abstract function names and duplicate variables while copying to instVars.
		// Looping the flat array so that base specific variables can be readily found without too much fuss
		for(let j = 0; j<flatBaseArr.length; j++)
		{
			let base = flatBaseArr[j];
	
			if((decl._jeepdef_.flags & this.CLASS_MANUALBASECTOR) && base.CONSTRUCTOR)
				JEEP.impl.MarkOverrides(overriddenInfo, base, "CONSTRUCTOR", base.CONSTRUCTOR);
	
			if(base._jeep_.vtable)
			{
				let iter = JEEP.Utils.ObjectIterator.New(base._jeep_.vtable);
				while(iter.GetNext())
				{
					let pair = iter.GetCurrPair();
					let vi = vtable[pair.key];
					if(vi && vi.reinfOrig && pair.value.type == JEEP.impl.FUNC_VIRTUAL)
						continue;
					vtable[pair.key] = pair.value;
				}
			}

			if(base.$def._jeepdef_.Variables)
			{
				let iter = JEEP.Utils.ObjectIterator.New(base.$def._jeepdef_.Variables.validVars);
				while(iter.GetNext())
				{
					let pair = iter.GetCurrPair();
					if(devmode)
						dupVars.Add(pair.key, base.$name);// add unconditionally because the base has it
					instVars[pair.key] = pair.value;
				}
			}
		}
		
		for(let j = 0; j<baseArr.length; j++)
		{
			let base = baseArr[j];			
			if(base._jeep_.vtable)
			{
				let iter = JEEP.Utils.ObjectIterator.New(base._jeep_.vtable);
				while(iter.GetNext())
				{
					let pair = iter.GetCurrPair();
					let owner = pair.value.type & JEEP.impl.FUNC_ABSTRACT ? pair.value.orig : pair.value.ownVF._jeepowner_.$name;
					if(devmode)
						dupVirtFuncs.Add(pair.key, pair.value.orig, owner);
				}
			}

			if(base._jeep_.varmap)
			{
				let iter = JEEP.Utils.ObjectIterator.New(base._jeep_.varmap);
				while(iter.GetNext())
				{
					let pair = iter.GetCurrPair();
					varmap[pair.key] = pair.value;
				}
			}

			if(devmode && base.$def._jeepdef_.prot)
			{
				if(base.$def._jeepdef_.prot.funcs)
				{
					let iter = JEEP.Utils.ObjectIterator.New(base.$def._jeepdef_.prot.funcs.validFuncs);
					while(iter.GetNext())
					{
						let pair = iter.GetCurrPair();
						let basevirt = pair.value.type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT)
						if(!basevirt)
							dupFuncs.Add(pair.key, base.$name);
						if(decl._jeepdef_.prot && decl._jeepdef_.prot.funcs)
						{
							let pfi = decl._jeepdef_.prot.funcs.validFuncs[pair.key];
							if(pfi)
							{
								let dervirt = pfi.type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT)
								if(basevirt && !dervirt)
									JEEP.impl.AddError("prot-base-virt-der-novirt", {func: pair.key, base: base.$name, derived: decl.$name})
								else if(!basevirt && dervirt)
									JEEP.impl.AddError("prot-base-novirt-der-virt", {func: pair.key, base: base.$name, derived: decl.$name})
							}
						}
						else if(decl._jeepdef_.Functions && decl._jeepdef_.Functions[pair.key])
							JEEP.impl.AddError("prot-base-der-pub", {func: pair.key, base: base.$name, derived: decl.$name})
					}
				}
				if(decl._jeepdef_.prot && decl._jeepdef_.prot.vars && base.$def._jeepdef_.prot && base.$def._jeepdef_.prot.vars)
				{
					let iter = JEEP.Utils.ObjectIterator.New(base.$def._jeepdef_.prot.vars.validVars);
					while(iter.GetNext())
					{
						let pair = iter.GetCurrPair();
						dupVars.Add(pair.key, base.$name);
					}
				}
			}
			else if(devmode && decl._jeepdef_.prot && decl._jeepdef_.prot.funcs)
			{
				let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.prot.funcs.validFuncs);
				while(iter.GetNext())
				{
					let pair = iter.GetCurrPair();
					if(base.$def._jeepdef_.Functions && base.$def._jeepdef_.Functions[pair.key])
						JEEP.impl.AddError("prot-der-base-pub",  {func: pair.key, base: base.$name, derived: decl.$name})
				}
			}

			if(base.$def._jeepdef_.flags & this.CLASS_INTERNALVARCHANGE)
				decl._jeepdef_.flags |= this.CLASS_INTERNALVARCHANGE;
			if(base.$def._jeepdef_.flags & this.CLASS_CONSTFUNC)
				decl._jeepdef_.flags |= this.CLASS_CONSTFUNC;

			// mark function occurance to detect duplicates
			let bobj = JEEP.Utils.ObjectIterator.New(base);
			while(bobj.GetNext())
			{
				let pair = bobj.GetCurrPair();
				// ignore these key properties
				if(pair.key == "ExternalCall" || pair.key[0] === "_" || pair.key[0] === "$"|| pair.key == "CONSTRUCTOR" || pair.key == "DESTRUCTOR")
					continue;
				let f = pair.value;
				if(typeof f === "function")
				{					
					if(devmode)
					{				
						let vi = vtable[pair.key];
						if(vi == undefined)
							dupFuncs.Add(pair.key, f._jeepowner_._jeepdef_.className);
					}
					// copy the function
					decl.prototype[pair.key] = f;
				}
			}			
		}
			
		if(devmode)
			dupVars.GenerateError();

		if(Object.keys(vtable).length > 0)
			decl.prototype._jeep_.vtable = vtable;
		if(Object.keys(varmap).length > 0)
			decl.prototype._jeep_.varmap = varmap;
	}

	return {baseArr: baseArr, dupFuncs: dupFuncs, dupVirtFuncs: dupVirtFuncs};
}

JEEP.impl.ProcessMemFuncs = function(env, decl, baseArr, info)
{
	let vtable = decl.prototype._jeep_.vtable || {};
	let devmode = env.IsDevMode();

	if(devmode)
	{
		if(decl._jeepdef_.Functions)
		{
			let protFuncs = decl._jeepdef_.prot && decl._jeepdef_.prot.funcs ? decl._jeepdef_.prot.funcs.validFuncs : null;
			let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.Functions);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				if((pair.value.type & JEEP.impl.FUNC_REPLACE) && baseArr.length == 0)
					JEEP.impl.AddError("func-replace-nobase", {name: decl._jeepdef_.className, func: pair.key})
				if(protFuncs)
				{
					if(protFuncs[pair.key] !== undefined)
						JEEP.impl.AddError("prot-pub", {what: "function", name: pair.key})
				}
			}
		}
	}

	if(decl._jeepdef_.ddVtable)
	{
		let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.ddVtable);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			if(pair.value.type & JEEP.impl.FUNC_ABSTRACT)
				vtable[pair.key] = pair.value;
		}
	}

	if(info.ddFuncMap && decl.CONSTRUCTOR)
		info.ddFuncMap['CONSTRUCTOR'] = {type: 0, argcount: decl.CONSTRUCTOR.length, argtype: ""};

	if(decl._jeepdef_.prot && decl._jeepdef_.prot.funcs)
	{
		let barr = decl.prototype._jeep_.flatBaseArr || baseArr;
		let iter = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.prot.funcs.validFuncs);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			let f = pair.value.func;
			f._jeepowner_ = decl;
			if(pair.value.type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT))
			{
				let vi = vtable[pair.key];
				let orig = vi && vi.orig ? vi.orig : decl.$name;
				vtable[pair.key] = JEEP.impl.VTableRecord.New({
					baseVF: f,
					ownVF: f,
					argcount: f.length,
					orig: orig,
					type: pair.value.type|JEEP.impl.FUNC_PROTECTED
				})
				if(devmode && info.dupVirtFuncs)// no need to check for abstract like public functions
					info.dupVirtFuncs.Add(pair.key, orig, decl.$name);
			}
			for(let k = 0; k<barr.length; k++)
			{
				let base = barr[k];
				if(base.$def._jeepdef_.prot && base.$def._jeepdef_.prot.funcs)
				{
					let bf = base.$def._jeepdef_.prot.funcs.validFuncs[pair.key];
					let virt = pair.value.type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT)
					if(bf && virt)
					{
						if(!(pair.value.type & JEEP.impl.FUNC_REPLACE) && !(decl._jeepdef_.flags & this.CLASS_REPLACEVIRTUAL))
							JEEP.impl.MarkOverrides(info.overriddenInfo, base, pair.key, bf.func);
						let vi = vtable[pair.key];
						if(vi)
							vi.baseVF = bf.func;
					}
				}
			}
		}
	}

	if(decl._jeepdef_.Functions)
	{
		let barr = decl.prototype._jeep_.flatBaseArr || baseArr;
		let fobj = JEEP.Utils.ObjectIterator.New(decl._jeepdef_.Functions);
		while(fobj.GetNext())
		{
			let pair = fobj.GetCurrPair();
			let f = pair.value.func;
			let plainf = f;// as opposed to special
			let type = pair.value.type;

			let isVirtual = type & JEEP.impl.FUNC_VIRTUAL;
			let overridable = isVirtual | (type & JEEP.impl.FUNC_ABSTRACT);

			if(isVirtual)
			{
				if(!(decl._jeepdef_.flags & this.CLASS_ANCESTORACCESS))
					barr = baseArr;
				for(let k = 0; k<barr.length; k++)
				{
					let base = barr[k];
					let bf = base[pair.key];
					if(bf && !(type & JEEP.impl.FUNC_REPLACE) && !(decl._jeepdef_.flags & this.CLASS_REPLACEVIRTUAL))
						JEEP.impl.MarkOverrides(info.overriddenInfo, base, pair.key, bf);
				}
			}

			if(devmode)
			{				
				if((type & JEEP.impl.FUNC_ABSTRACT) && info.ddMode)
					JEEP.impl.AddError("abstract-implemented", {name: pair.key});
				else if(overridable && decl._jeepdef_.ddVtable)
				{
					let vi = decl._jeepdef_.ddVtable[pair.key];
					if(vi && (vi.argcount != plainf.length))
					{
						JEEP.impl.AddError("func-argcount-mismatch-baseder", {
							type: "abstract", 
							name: pair.key, 
							base: vi.orig, "base-count": vi.argcount, 
							derived: decl._jeepdef_.className, "der-count": plainf.length
						});
						continue;
					}
				}
				else
				{					
					let vbases = [], nvbases = [];
					for(let k = 0; k<baseArr.length; k++)
					{
						let base = baseArr[k];	
						let bvi = base._jeep_.vtable ? base._jeep_.vtable[pair.key] : null
						let presentInBase = base[pair.key] !== undefined;
						if(baseArr.length > 1)// do this only for multiple
						{
							if(bvi)
								vbases.push(base.$name)
							else if(presentInBase)
								nvbases.push(base.$name)
						}
						if(bvi)
						{
							if(!overridable && baseArr.length == 1)
								JEEP.impl.AddError("func-decl-mismatch-baseder", {name: pair.key, decl: "virtual", where: "base", "class-name": base.$name, "not-where": "derived", "not-where-name": decl._jeepdef_.className});
							if((bvi.type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT))&&(type & JEEP.impl.FUNC_VIRTUAL))
							{
								let bt = bvi.type;
								if(bt & JEEP.impl.FUNC_ABSTRACT)
								{
									bt &= ~JEEP.impl.FUNC_ABSTRACT
									bt |= JEEP.impl.FUNC_VIRTUAL
								}
								let bty = this.RemoveImplDirectives(bt);
								let ty = this.RemoveImplDirectives(type);
								if(bty != ty)
								{
									let b = JEEP.impl.GetDecorationName(bty);
									let t = JEEP.impl.GetDecorationName(ty);
									JEEP.impl.AddError("func-virt-decl-mismatch-baseder", {
										name: pair.key,
										"base-decl": b,
										"base-name": base.$name,
										"der-decl": t,
										"der-name": decl._jeepdef_.className
									});
								}
							}
							if(bvi.argcount != plainf.length)
								JEEP.impl.Errors.Add("The argument count for the "+(bvi.type & JEEP.impl.FUNC_ABSTRACT ? "abstract" : "virtual")+" function '" + pair.key + "' is declared as " +bvi.argcount+ " in base class ["+base.$name+"] but as " +plainf.length+ " in derived class");
						}
						else if(overridable && presentInBase)
							JEEP.impl.AddError("func-decl-mismatch-baseder", {name: pair.key, decl: isVirtual ? "virtual" : "abstract", where: "derived", "class-name": decl._jeepdef_.className, "not-where": "base", "not-where-name": base.$name});
						else if(!presentInBase && (pair.value.type & JEEP.impl.FUNC_REPLACE))
							JEEP.impl.AddError("func-replace-nobase-virt", {name: decl._jeepdef_.className, func: pair.key})

						// no 'else', its a separate test
						if(overridable && bvi && bvi.argtype)
						{
							let t = decl._jeepdef_.TypedFunctions ? decl._jeepdef_.TypedFunctions[pair.key] : null;
							if(!t || t.type != bvi.argtype)
								JEEP.impl.AddError("func-argtype-mismatch-baseder", {
									"base-type": bvi.argtype,
									"der-type": t ? t.type : "<none>",
									name: pair.key, 
									base: bvi.orig, 
									derived: decl._jeepdef_.className, 
								});
						}
					}
					if(vbases.length > 0 && nvbases.length > 0)
						JEEP.impl.AddError("func-virtual-somebase", {name: pair.key, vbases: vbases.join(), nvbases: nvbases.join()});
				}
			}

			f = this.CreateSpecialFunctions(env, decl, f, pair.key, type);

			if(decl._jeepdef_.priv && ((type & JEEP.impl.FUNC_USEPRIV) || (decl._jeepdef_.flags & this.CLASS_USINGPRIVATE)))
				decl._jeepdef_.priv.users[pair.key] = f;

			f._jeepowner_ = decl;

			let argtype = "";
			if(decl._jeepdef_.TypedFunctions)
			{
				let t = decl._jeepdef_.TypedFunctions[pair.key];
				if(t)
					argtype = t.type;
			}

			if(type & JEEP.impl.FUNC_ABSTRACT)
			{
				delete decl.prototype[pair.key];
				let vi = vtable[pair.key];
				let orig = vi && vi.orig ? vi.orig : decl._jeepdef_.className;
				vtable[pair.key] = JEEP.impl.VTableRecord.New({
					argtype: argtype,
					argcount: plainf.length,
					orig: orig,
					reinfOrig: vi ? decl._jeepdef_.className : "",
					type: type,
				})
				if(devmode && info.dupVirtFuncs)
					info.dupVirtFuncs.Add(pair.key, orig, decl._jeepdef_.className);
			}
			else
			{
				if(!isVirtual)
				{
					if(devmode && info.dupFuncs)
						info.dupFuncs.Add(pair.key, decl._jeepdef_.className);
					decl.prototype[pair.key] = f;
				}
				else
				{
					let baseVF = decl.prototype[pair.key];// it would have been copied from base, hence this test
					if(baseVF === undefined)
						decl.prototype[pair.key] = f;
					let vi = vtable[pair.key]
					let orig = vi && vi.orig ? vi.orig : decl._jeepdef_.className;
					if(devmode && info.dupVirtFuncs)
						info.dupVirtFuncs.Add(pair.key, orig, decl._jeepdef_.className);
					vtable[pair.key] = JEEP.impl.VTableRecord.New({
						baseVF: baseVF || f,// baseVF could be null, which would crash when disabling polymorphism
						ownVF: f,
						argtype: argtype,
						argcount: plainf.length,
						orig: orig,
						type: type,
					})
				}
			}
		
			if(devmode && info.ddFuncMap)
				info.ddFuncMap[pair.key] = {type: type, argcount: plainf.length, specialFunc: f.specialFunc, argtype: argtype};
		}
	}

	if(devmode)
	{
		if(info.dupVirtFuncs)
		{
			info.dupVirtFuncs.Process(function(_, pair){
				let ofSameLine =  pair.value.arr.length == 1 && pair.value.nondupInfo.length > 1;
				let vi = vtable[pair.key]
				if(ofSameLine && !vi.reinfOrig)
				{
					let bnames = pair.value.nondupInfo
					if(bnames.indexOf(decl._jeepdef_.className) < 0)
						JEEP.impl.AddError("func-virtual-common-ambiguous", {name: pair.key, bases: bnames.join(", ")})
				}
				return ofSameLine;// when true, deletes the pair to avoid repeated error
			});
		}
	}

	if(vtable)
		decl.prototype._jeep_.vtable = vtable;
	
	// setup getters and setters for variables if any
	if(info.getsetVars)
		JEEP.impl.CreateVariableGetterSetter(env, decl, info.getsetVars, info.ddFuncMap);

	// Validate declare-define consistency after all functionns are processed (including getters and setters)
	if(devmode)
	{
		if(info.ddFuncMap)
		{
			this.ValidateDeclareDefine(decl._jeepdef_.ddFuncMap, info.ddFuncMap, decl._jeepdef_.className);
			if(decl._jeepdef_.ddTypedFuncs)
			{
				let iter = JEEP.Utils.ObjectIterator.New(info.ddFuncMap);
				while(iter.GetNext())
				{
					let pair = iter.GetCurrPair();
					let t = decl._jeepdef_.ddTypedFuncs[pair.key];
					if((t === undefined && pair.value.argtype.length > 0) || (t && t != pair.value.argtype))
						JEEP.impl.AddError("invalid-argtype-decl-split", {
							func: pair.key,
							"decl-type": t ? t : "<none>",
							"def-type": pair.value.argtype ? pair.value.argtype : "<none>"
						})
				}
			}
			if(decl._jeepdef_.prot || decl._jeepdef_.ddProtFuncs)
				JEEP.impl.ValidateDeclareDefineProtected(decl);
		}
	}
}

JEEP.impl.CreateVariableGetterSetter = function(env, decl, getsetVars, definedFuncs)
{
	let vobj = JEEP.Utils.ObjectIterator.New(getsetVars);
	while(vobj.GetNext())
	{
		let pair = vobj.GetCurrPair();
		let funcs = JEEP.impl.CreateGetterSetter({
			vname: pair.key, def: decl, flag: pair.value,
			thisObj: null, // null means needs rebased 'this'	
			protFuncs: decl._jeepdef_.prot && decl._jeepdef_.prot.funcs ? decl._jeepdef_.prot.funcs.validFuncs : null,
		});
		if((env.flags == JEEP.impl.ENV_DEVMODE) && definedFuncs && funcs)
		{
			if(decl._jeepdef_.ddFuncMap)
			{
				if(funcs.getter &&	decl._jeepdef_.ddFuncMap[funcs.getterName] === undefined)
					JEEP.impl.AddError("getter-setter-defined-not-declared", {type: "getter", name: pair.key});
				if(funcs.setter &&	decl._jeepdef_.ddFuncMap[funcs.setterName] === undefined)
					JEEP.impl.AddError("getter-setter-defined-not-declared", {type: "setter", name: pair.key});
			}
			if(funcs.getter)
				definedFuncs[funcs.getterName] = {type: 0, argcount: funcs.getter.length, argtype: ""};
			if(funcs.setter)
				definedFuncs[funcs.setterName] = {type: 0, argcount: funcs.setter.length, argtype: ""};
		}
	}
}

JEEP.impl.RemoveImplDirectives = function(type)
{
	return type & ~JEEP.impl.FUNC_IMPL_DIRECTIVES
}

JEEP.impl.ValidateDeclareDefineProtected = function(decl)
{
	let declFuncs = decl._jeepdef_.ddProtFuncs ? decl._jeepdef_.ddProtFuncs.validFuncs : null;
	let defFuncs = decl._jeepdef_.prot && decl._jeepdef_.prot.funcs ? decl._jeepdef_.prot.funcs.validFuncs : null
	if(!declFuncs && !defFuncs)
		return;
	if(declFuncs)
	{
		let iter = JEEP.Utils.ObjectIterator.New(declFuncs);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			if(pair.value.type & JEEP.impl.FUNC_ABSTRACT)
				continue;
			if(!defFuncs || defFuncs[pair.key] === undefined)
				JEEP.impl.AddError("prot-decl-nodef", {func: pair.key})
		}
	}
}

JEEP.impl.ValidateDeclareDefine = function(declaredFuncs, definedFuncs, className)
{
	// All declared functions must be defined, but the opposite is not necessary as private functions
	// will (should) not be declared but are defined. So, compare the declared ones with defined ones.
	let fobj = JEEP.Utils.ObjectIterator.New(declaredFuncs);
	while(fobj.GetNext())
	{
		let pair = fobj.GetCurrPair();
		let fname = pair.key;
		if(pair.key[0] == "$")
		{
			if(!(pair.value.type & JEEP.impl.FUNC_STATIC))
				JEEP.impl.Abort({where: "", reason: "INTERNAL ERROR RELATED TO STATIC."});
			fname = pair.key.substr(1);
		}
		if(pair.key === "CONSTRUCTOR")
			fname = pair.key;
		let type = pair.value.type;
		let p = definedFuncs[pair.key];
		if(p === undefined)
		{
			if(!(type & JEEP.impl.FUNC_ABSTRACT))// leave abstract function as it should be absent for the class!
				JEEP.impl.AddError("func-declared-not-defined", {name: fname});
		}
		else if(p.specialFunc)
			continue;
		else if(p.argcount != pair.value.argcount)
			JEEP.impl.AddError("func-argcount-mismatch-decdef", {name: fname, "decl-count": pair.value.argcount, "def-count": p.argcount});
		else
		{
			// don't consider implementation detail flags as it is bound to be a mismatch
			let def = this.RemoveImplDirectives(p.type);
			let dec = this.RemoveImplDirectives(type);
			if(def != dec)
			{
				def = JEEP.impl.GetDecorationName(def);
				dec = JEEP.impl.GetDecorationName(dec);
				JEEP.impl.AddError("func-decl-mismatch-decdef", {name: pair.key, "decl-type": dec, "def-type": def});
			}
		}
	}
	// A special test for constructor to be declared if defined (declare but not defined is tested above with regualar functons)
	let consDefined = (undefined !== definedFuncs["CONSTRUCTOR"]);
	let consDeclared = (undefined !== declaredFuncs["CONSTRUCTOR"]);
	if(!consDeclared && consDefined)
		JEEP.impl.AddError("ctor-defined-not-declered");
}

JEEP.impl.DeclarePreProc = function (env, className, src, funcMap, isStatic, vtable)
{
	let obj = JEEP.Utils.ObjectIterator.New(src.validFuncs);
	while(obj.GetNext())
	{
		let pair = obj.GetCurrPair();
		let type = pair.value.type;
		let func = pair.value.func;
		let t = src.typedFuncs ? src.typedFuncs[pair.key] : null;
		let argtype = t ? t.type : "";
		if(isStatic)// disambiguate name with a dollar as the same map is used for member functions
			funcMap["$"+pair.key] = {type: JEEP.impl.FUNC_STATIC, argcount: func.length, argtype: argtype}
		else if(type & (JEEP.impl.FUNC_VIRTUAL|JEEP.impl.FUNC_ABSTRACT))
		{
			funcMap[pair.key] = {type: type, argcount: func.length};
			vtable[pair.key] = JEEP.impl.VTableRecord.New({
				argcount: func.length,
				orig: className,
				type: type,
				argtype: argtype
			})
		}
		else
			funcMap[pair.key] = {type: type, argcount: func.length, argtype: argtype}
	}
}

JEEP.impl.CreateInstanceVariables = function(info)
{
	let hasAccFlag = info.inst.$def._jeepdef_.flags & (JEEP.impl.CLASS_CONSTFUNC|JEEP.impl.CLASS_INTERNALVARCHANGE);
	let restrictedAccess = hasAccFlag && ((info.env.flags == JEEP.impl.ENV_DEVMODE) || (info.env.flags & (JEEP.impl.ENV_RETAIN_CONST|JEEP.impl.ENV_RETAIN_INTVARCHANGE)));
	
	let instVars = this.InstantiateVariables(info.vars);
	if(!restrictedAccess)
	{
		let names = Object.keys(instVars);
		for(let k = 0; k<names.length; k++)
			info.loc[names[k]] = instVars[names[k]];
	}
	else
	{
		let inst = info.inst;
		
		let sentinel = info.sentinel || {
			accessFlag: inst._jeep_.accessFlag, 
			constFuncName: "",
			vars: {}
		};

		let iter = JEEP.Utils.ObjectIterator.New(instVars)
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			let vname = pair.key;
			sentinel.vars[vname] = pair.value;
			Object.defineProperty(info.loc, vname, {
				configurable: false,
				enumerable: true,// need to be while wrapping
				set: function(v){
					let varname = inst._jeep_.varmap ? inst._jeep_.varmap [vname] : vname;
					varname = varname || vname;
					if(JEEP.impl.ACC_CONSTFUNC & info.flag)
					{
						if(sentinel.accessFlag & JEEP.impl.ACC_CONSTFUNC)
							JEEP.impl.Abort({runtime: true, reason: "The function '" +sentinel.constFuncName+ "' is declared constant but tried to modify the variable '" +varname+ "'", className: info.className || inst.$name});
					}
					if(JEEP.impl.ACC_INTERNALVARCHANGE & info.flag)
					{
						if(sentinel.accessFlag & JEEP.impl.ACC_INTERNALVARCHANGE)
							JEEP.impl.Abort({runtime: true, reason: "The variable '" +vname+ "' was attempted to be modified externally", className: info.className || inst.$name});
					}
					sentinel.vars[vname] = v;
				},
				get: function(){
					let a = sentinel.vars[vname];
					if((sentinel.accessFlag & (JEEP.impl.ACC_CONSTFUNC|JEEP.impl.ACC_INTERNALVARCHANGE)) && typeof a === 'object')
						a = JEEP.Utils.DeepClone(a);
					return a;
				},
			});				
		}
		info.loc._jeepsentinel_ = sentinel;
		sentinel.privilage = info.privilage;
	}
}

JEEP.impl.MakeLayeredFunction = function(f, i)
{
	let inst  = i;
	return function(){
		return f.apply(inst, arguments)
	};
}

JEEP.impl.InstantiateProtectedMembers = function(env, classDef, inst, enforce, sentinel, className, noCreateVars)
{
	let $ = enforce ? {} : inst;

	$ = inst.$ || $;// to allow inherited peotected members

	if(classDef._jeepdef_.prot.vars)
	{
		if(enforce)
		{
			let iter = JEEP.Utils.ObjectIterator.New(classDef._jeepdef_.prot.vars.validVars);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				if(typeof pair.value === 'function')
					continue;
				Object.defineProperty(inst, pair.key, {
					enumerable: false, configurable: false,
					set: function(v){
						JEEP.impl.Abort2({
							runtime: true,
							id: "prot-access", idnames: {
								what: "variable", name: pair.key, className: inst.$name
							}
						})
					},
					get: function(){
						JEEP.impl.Abort2({
							runtime: true,
							id: "prot-access", idnames: {
								what: "variable", name: pair.key, className: inst.$name
							}
						})
					}
				});
			}
		}
		if(!noCreateVars)
		{
			JEEP.impl.CreateInstanceVariables({
				env: env,
				vars: classDef._jeepdef_.prot.vars.validVars,
				inst: inst,
				loc: $,
				flag: JEEP.impl.ACC_CONSTFUNC|JEEP.impl.ACC_INTERNALVARCHANGE,
				privilage: "protected",
				sentinel: sentinel,
				className: className,
			})
		}
	}
	if(classDef._jeepdef_.prot.funcs)
	{
		let iter = JEEP.Utils.ObjectIterator.New(classDef._jeepdef_.prot.funcs.validFuncs);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			if(enforce)
			{
				inst[pair.key] = function(){JEEP.impl.Abort2({
					runtime: true,
					id: "prot-access", idnames: {
						what: "function", name: pair.key, className: inst.$name
					}
				})}
				let f = JEEP.impl.MakeLayeredFunction(pair.value.func, inst);
				$[pair.key] = f;
				if(inst._jeep_.vtable)
				{
					let vi = inst._jeep_.vtable[pair.key];
					if(vi )
					{
						if(vi.ownVF == vi.baseVF)
							vi.baseVF = f;
						else if(!(vi.type & JEEP.impl.FUNC_LAYERED))
							vi.baseVF = JEEP.impl.MakeLayeredFunction(vi.baseVF, inst);
						vi.ownVF = f;
						vi.type |= JEEP.impl.FUNC_LAYERED;
					}
				}
			}
			else
			{
				$[pair.key] = pair.value.func;
			}
		}
    }
	inst.$ = $;
}

JEEP.impl.InstantiatePrivateMembers = function(env, classDef, inst)
{
	let privThis = {};

	let iter = JEEP.Utils.ObjectIterator.New(inst);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		if(typeof pair.value === 'function')
			continue;
		Object.defineProperty(privThis, pair.key, {
				enumerable: false,
				configurable: false,
				set: function(v){inst[pair.key]=v},
				get: function(){return inst[pair.key]},
			});

	}

	let privProto = JEEP.Utils.ShallowClone(Object.getPrototypeOf(inst));
	JEEP.Utils.Merge(privProto, privThis)
	let $$ = {rebasedFuncs: {}};
	privThis.$$ = $$;
	privThis.$ = inst.$;

	if(classDef._jeepdef_.priv.vars)
	{
		JEEP.impl.CreateInstanceVariables({
			env: env,
			vars: classDef._jeepdef_.priv.vars,
			inst: inst,
			loc: $$,
			flag: JEEP.impl.ACC_CONSTFUNC,// no need of internal change flag
			privilage: "private",
		})
	}

	iter.Reset(classDef._jeepdef_.priv.rebasedFuncs);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		$$.rebasedFuncs[pair.key] = function(){return pair.value.apply(privThis, arguments)};// value is function for rebasedFuncs
	}

	if(classDef._jeepdef_.priv.funcs)
	{
		iter.Reset(classDef._jeepdef_.priv.funcs.validFuncs);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			$$[pair.key] = function(){return pair.value.func.apply(privThis, arguments)};
		}
	}

	let proto = Object.getPrototypeOf(inst);
	iter.Reset(classDef._jeepdef_.priv.users);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		proto[pair.key] = function(){return pair.value.apply(privThis, arguments)};
	}

	if(classDef._jeepdef_.prot && classDef._jeepdef_.prot.funcs)
	{
		iter.Reset(classDef._jeepdef_.prot.funcs.validFuncs);
		while(iter.GetNext())
		{
			let pair = iter.GetCurrPair();
			if(pair.value.type & JEEP.impl.FUNC_USEPRIV)
				privThis.$[pair.key] = function(){return pair.value.func.apply(privThis, arguments)};
		}
	}

	return (classDef._jeepdef_.flags & this.CLASS_CTORUSINGPRIVATE) ? 
		function(){return classDef.prototype.CONSTRUCTOR.apply(privThis, arguments)} : 
		classDef.prototype.CONSTRUCTOR;
}

JEEP.impl.TrapVirtualFunction = function(f, fname, cname)
{
	return function(){
		if(this._jeep_.polymorphismBlockedDueTo)
		{
			this._jeep_.polymorphismBlocked = true;// (hack) to stop double constructor fail message
			JEEP.impl.Abort({runtime: true, className: cname, id: "invalid-virtual-call", idnames: {
				func: fname, where: this._jeep_.polymorphismBlockedDueTo
			}})
		}
		return f.apply(this, arguments)
	}	
}
JEEP.impl.CreateSpecialFunctions = function(env, decl, f, name, type, useRebasedFuncs, priv)
{
	let givenf = f;
	let devmode = env.IsDevMode();
	let restrictedAccess = decl && (devmode || (env.flags & (JEEP.impl.ENV_RETAIN_CONST|JEEP.impl.ENV_RETAIN_INTVARCHANGE)));

	if((type & JEEP.impl.FUNC_VIRTUAL) && (decl._jeepdef_.flags & JEEP.impl.CLASS_TRAPVIRTUALCALL) && (devmode || env.flags & JEEP.impl.ENV_RETAIN_VIRTUALTRAP))
	{
		f = JEEP.impl.TrapVirtualFunction(f, name, decl._jeepdef_.className)
	}

	if((type & JEEP.impl.FUNC_ARGNUM) && (devmode || env.flags & JEEP.impl.ENV_RETAIN_NUMARG))
	{
		f = this.MakeArgNumFunction(f, name, "", useRebasedFuncs);
		useRebasedFuncs = false;
	}

	if((type & JEEP.impl.FUNC_ARGCONST) && (devmode || env.flags & JEEP.impl.ENV_RETAIN_ARGCONST))
	{
		f = this.MakeArgConstFunction(f, name, useRebasedFuncs);
		useRebasedFuncs = false;
	}

	if((restrictedAccess) && (type & JEEP.impl.FUNC_CONSTANT))
	{
		if(decl)
			decl._jeepdef_.flags |= this.CLASS_CONSTFUNC;
		f = this.MakeConstantFunction(f, name, useRebasedFuncs, priv);
		useRebasedFuncs = false;
	}
	else if(restrictedAccess && (decl._jeepdef_.flags & this.CLASS_INTERNALVARCHANGE))
	{
		f = this.MakeNonConstantFunction(f, name, useRebasedFuncs, priv);
		useRebasedFuncs = false;
	}

	if(type & JEEP.impl.FUNC_SCOPED)
	{
		f = this.MakeScopedFunction(f, name, useRebasedFuncs);
		useRebasedFuncs = false;
	}

	if(decl && decl._jeepdef_.TypedFunctions)
	{
		let t = decl._jeepdef_.TypedFunctions[name]
		if(t)
		{
			f = this.MakeArgTypeFunction(decl._jeepdef_.className, f, name, t.arr, useRebasedFuncs)
			useRebasedFuncs = false;
		}
	}

	if(f != givenf)
		f.specialFunc = true;
	return f;
}

JEEP.impl.RunCopyConstructor = function(copy, inst)
{
	let vars = {};
	let iter = JEEP.Utils.ObjectIterator.New(copy);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		if(typeof pair.value !== 'function')
			vars[pair.key] = pair.value;
	}
	vars = this.InstantiateVariables(this.ProcessVariables(null, vars));
	iter.Reset(vars);
	while(iter.GetNext())
	{
		let pair = iter.GetCurrPair();
		inst[pair.key] = pair.value;
	}
}

JEEP.impl.RunInitConstructor = function(env, initInfo, inst)
{
	let inkeys = Object.keys(initInfo)
	if((env.flags == JEEP.impl.ENV_DEVMODE))
	{
		let vars = Object.keys(inst._jeep_.vars)
		if(vars.length === 0)
			JEEP.impl.Abort({runtime: true, className: inst.$name, id: "vars-novars"});
		let err = []
		for(let k = 0; k<inkeys.length; k++)
		{
			if(inst._jeep_.vars[inkeys[k]] === undefined)
				err.push(inkeys[k])
		}
		if(err.length > 0)
			JEEP.impl.Abort({runtime: true,  className: inst.$name, id: "invalid-vars", idnames: {"vars-list": err.join(", ")}});
	}
	// Constructors are not sandwiched and layered, so they are considered external functions by
	// the associated code. So fix the access flag before changing the variables.
	let acc = 0;
	if(inst._jeepsentinel_)
	{
		acc = inst._jeepsentinel_.accessFlag;
		inst._jeepsentinel_.accessFlag = 0;
	}
	for(let k = 0; k<inkeys.length; k++)
		inst[inkeys[k]] = initInfo[inkeys[k]]
	// Reset the access flag
	if(inst._jeepsentinel_)
		inst._jeepsentinel_.accessFlag = acc;
}

JEEP.impl.InvokeConstructors = function(env, inst, ctorArray, ownCtor, args)
{
	JEEP.impl.EnablePolymorphism(false, inst, "constructor");

	// Constructors are not sandwiched and layered, so they are considered external functions by
	// the associated code. So fix the access flag before changing the variables.
	let acc = 0;
	if(inst._jeepsentinel_)
	{
		acc = inst._jeepsentinel_.accessFlag;
		inst._jeepsentinel_.accessFlag = 0;
	}

	let ex = null;
	let pass = true;
	let failure = {baseName: "", baseIndex: -1, inst: false};

	// --- call the base constructors unless instructed otherwise
	if(!(inst.$def._jeepdef_.flags & JEEP.impl.CLASS_MANUALBASECTOR))
	{
		let k = 0;			
		for(k = 0; k<ctorArray.length && pass; k++)
		{
			try{pass &= (false !== ctorArray[k].CONSTRUCTOR.apply(inst, args));}
			catch(e){ex=e;pass=false;}
		}
		if(!pass)
		{
			failure.baseIndex = k-2;// one for the increment before pass is checked and one to skip the failed base
			failure.baseName = ctorArray[k-1].name;
		}
	}

	// --- call the real instance constructor
	if(pass)
	{
		try{pass &= (false !== ownCtor.apply(inst, args))}
		catch(e){ex=e;pass=false;}
		if(!pass)
			failure.inst = true;
	}

	// --- upon failure, partially destruct the instance when not manually constructed
	if(!pass && !(inst.$def._jeepdef_.flags & JEEP.impl.CLASS_MANUALBASECTOR))
	{
		let dest = null;
		let pos = (failure.inst && inst._jeep_.flatBaseArr) ? inst._jeep_.flatBaseArr.length-1 : failure.baseIndex;
		while(pos >= 0)
		{
			if(dest = inst._jeep_.flatBaseArr[pos--].DESTRUCTOR)
				dest.apply(inst);
		}
	}
	
	// Reset the access flag
	if(inst._jeepsentinel_)
		inst._jeepsentinel_.accessFlag = acc;

	JEEP.impl.EnablePolymorphism(true, inst);
	
	if(!pass)
	{
		let msg = "";
		if(inst._jeep_.polymorphismBlocked)
			ex = null; // hack to have just the failure message as the reason would have been just given
		if(failure.inst)
			msg = "The class '" + inst.$name + "' failed to instantiate" +(ex?"":".");
		else
			msg = "The class '" + inst.$name + "' failed to instantiate at base '" +failure.baseName+"'" +(ex?"":".");
		if(ex)
			msg += " due to the exception <" +ex+ ">.";
		throw new Error(msg);
	}
}

JEEP.impl.Abort2 = function(info)
{
	let reason = JEEP.impl.ErrorMessages.Get(info.id, info.idnames);
	let msg = "";
	if(info.runtime)
		msg = JEEP.impl.ErrorMessages.Get("abort-reason-runtime", {reason: reason});
	else if(info.objName)
		msg = JEEP.impl.ErrorMessages.Get("abort-reason-objname", {where: info.where, reason: reason, objName: info.objName, objType: info.objType});
	else
		msg = JEEP.impl.ErrorMessages.Get("abort-reason", {where: info.where, reason: reason});

	let err = JEEP.impl.Errors;
	if(JEEP.impl.testCase)
	{
		JEEP.impl.testCase.AddGenerated(msg);
		for(let k = 1; k<err.arr.length; k++)
			JEEP.impl.testCase.AddGenerated(err.arr[k]+".");
	}
	else
	{
		if(!err.Empty())
			msg += err.Text()
		this.stderr(msg);
	}
	err.Reset();
	throw new Error("JEEP aborted.");
}

JEEP.impl.Abort = function(info)
{
	let str = "";
	let type = info.type || "class";
	let reason = info.reason;
	if(!reason && info.id)
		reason = JEEP.impl.ErrorMessages.Get(info.id, info.idnames);
	if(info.runtime)
		str = JEEP.impl.ErrorMessages.Get("abort-runtime", {type: type, reason: reason, className: info.className});
	else if(info.noclass)
		str = JEEP.impl.ErrorMessages.Get("abort-noclass", {where: info.where, reason: reason});
	else if(info.where)
		str = JEEP.impl.ErrorMessages.Get("abort-where", {type: type, reason: reason, where: info.where, className: info.className});
	else
		str = JEEP.impl.ErrorMessages.Get("abort", {type: type, className: info.className});
	let err = info.more || JEEP.impl.Errors;
	let extra = err && !err.Empty();
	if(!JEEP.impl.testCase)
		this.stderr(str + (extra ? err.Text(JEEP.impl.testCase !== undefined) : ""));
	else
	{
		JEEP.impl.testCase.AddGenerated(str);
		for(let k = 1; k<err.arr.length; k++)
			JEEP.impl.testCase.AddGenerated(err.arr[k]+".");
	}
	
	err.Reset();
	throw new Error("JEEP aborted.");
}

JEEP.impl.AddError = function(id, tags){JEEP.impl.Errors.Add(JEEP.impl.ErrorMessages.Get(id, tags))}
JEEP.impl.QuickAbort = function(className){JEEP.impl.Abort({className: className});}

JEEP.impl.ProcessVariables = function(env, vars, where, which, className)
{
	if(!vars)
		return null;
	let _validate_ = env && (env.flags == JEEP.impl.ENV_DEVMODE);
	let ret = {};
	let valid = true;
	let keys = Object.keys(vars);
	for(let k = 0; k<keys.length; k++)
	{
		let v = vars[keys[k]];
		if(_validate_ && typeof v === 'function')
		{
			JEEP.impl.AddError("var-not-object", {type: which, name: keys[k]});
			valid = false;
			continue;
		}
		let type = this.VT_POD;
		if(v === undefined && _validate_)
			JEEP.impl.AddError("var-set-undefined", {type: which, name: keys[k]});
		else if(v !== null)
		{
			if(Array.isArray(v) && v.length == 0)
				type = this.VT_EMPTYARRAY;
			else if(typeof v == "object")
				type = Object.keys(v).length == 0 ? this.VT_EMPTYOBJECT : this.VT_OBJECT;
		}
		ret[keys[k]] = {value: v, type: type};
	}
	return valid ? ret : null;
}

JEEP.impl.InstantiateVariables = function(vars)
{
	let ret = {};
	let keys = Object.keys(vars);
	for(let k = 0; k<keys.length; k++)
	{
		let i = vars[keys[k]];
		if(i === undefined)
			continue;
		switch(i.type)
		{
			case JEEP.impl.VT_EMPTYOBJECT: ret[keys[k]] = {}; break;
			case JEEP.impl.VT_EMPTYARRAY: ret[keys[k]] = []; break;
			case JEEP.impl.VT_OBJECT: ret[keys[k]] = JEEP.Utils.DeepClone(i.value); break;
			default: ret[keys[k]] = i.value;
		}
	}
	return ret;
}

JEEP.impl.ReservedWords = ["Change", "Clone", "Equal", "InstanceOf", "New"]

JEEP.impl.ChangeInst = function(info)
{		
	let keys = Object.keys(info.spec);
	for(let k = 0; k<keys.length; k++)
	{
		let kname = keys[k];
		if(kname[0] == '$' || this.ReservedWords.indexOf(kname) >= 0)
			continue;
		if(info.validate && info.vars[kname] === undefined)
			JEEP.impl.Abort({runtime: true, type: "record",reason: "Attempted to " +(info.changing?"change":"initiate with")+" non existant variable '"+kname+"'", className: info.name});
		info.inst[kname] = info.spec[kname]
	}
}

JEEP.impl.SetupDef = function(def)
{
	def.InstanceOf = function(inst){
		return (inst && inst.$name && (inst.$name === def.$name))
	}
}

JEEP.impl.SetupInstance = function(info)
{
	let _validate_ = info.env && ((info.env.flags == JEEP.impl.ENV_DEVMODE) || (info.env.flags & JEEP.impl.ENV_RETAIN_CHANGE));

	info.inst.$name = info.name;
	if(!info.noCreateVars)
	{
		let instVars = JEEP.impl.InstantiateVariables(info.vars);
		let keys = Object.keys(instVars);
		for(let k = 0; k<keys.length; k++)
			info.inst[keys[k]] = instVars[keys[k]];
		// change the variables if necessary
		if(info.instSpec)
			JEEP.impl.ChangeInst({
					validate: _validate_, name: info.name, changing: false,
					inst: info.inst, spec: info.instSpec, vars: info.vars, 
				})
	}
	info.inst.Clone = function(){
		return JEEP.Utils.DeepClone(this);
	}
	if(!info.noChange)
	{
		info.inst.Change = function(spec){
			JEEP.impl.ChangeInst({
				validate: _validate_, name: info.name, changing: true,
				inst: info.inst, spec: spec, vars: info.vars, 
			})
		}
	}
	info.inst.Equal = function(other){
		if(!info.def.InstanceOf(this) || !info.def.InstanceOf(other))
			return false;
		let keys = Object.keys(info.vars);
		let equal = true;
		for(let k = 0; k<keys.length; k++)
		{
			let i = info.vars[keys[k]];
			switch(i.type)
			{
				case JEEP.impl.VT_EMPTYOBJECT: equal &= true; break;
				case JEEP.impl.VT_EMPTYARRAY: equal &= true; break;
				case JEEP.impl.VT_OBJECT:
					equal &= JSON.stringify(this[keys[k]]) === JSON.stringify(other[keys[k]]);
					break;
				default: equal &= this[keys[k]] === other[keys[k]];
	
			}
		}
		return equal
	}
}

JEEP.impl.DoDefineRecord = function(env, noAdd, name, spec)
{
	let _validate_ = env && (env.flags == JEEP.impl.ENV_DEVMODE);

	if(_validate_)
	{
		if(!spec)
			JEEP.impl.Abort({type: "record", where: "RegisterRecord", reason: "The record description is missing", className: name});
		let keys = Object.keys(spec);
		for(let k = 0; k<keys.length; k++)
		{
			let kname = keys[k];
			if(kname[0] == "$" || JEEP.impl.ReservedWords.indexOf(kname) >= 0)
			{
				JEEP.impl.AddError("reserved-word-name", {type: "record", what: "variable", name: name, vname: kname})
				continue;
			}
			if(typeof spec[kname] === 'function')
				JEEP.impl.AddError("record-func", {func: kname, name: name})
		}
	}
	
	let vars = this.ProcessVariables(env, spec, "RegisterRecord", "member", "");
	
	if(_validate_ && !JEEP.impl.Errors.Empty())
		JEEP.impl.Abort({type: "record", where: "RegisterRecord", reason: "The record description syntax is wrong", className: name});

	let Record = {$name: name};
	JEEP.impl.SetupDef(Record)
	Record.New = function(spec)
	{
		let inst = {}
		JEEP.impl.SetupInstance({env: env, instSpec: spec, def: Record, inst: inst, vars: vars, name: name})
		return inst;
	}
	if(noAdd)
		return Record;
	JEEP.impl.ObjectDatabase.Add(Record, name, "record");
}

JEEP.impl.GetInitNewInfo = function(args)
{
	return (typeof args[0] === 'string' && args[0] === "init" && typeof args[1] === 'object') ? args[1] : null
}

JEEP.impl.DoDefineStruct = function(env, noAdd, name, spec)
{
	let _validate_ = env && (env.flags == JEEP.impl.ENV_DEVMODE);

	if(_validate_)
	{
		if(!spec.Variables)
			this.Abort({type: "struct", where: "RegisterStruct", reason: "A structure cannot be defined without variables", className: name});
	}
	
	let vars = this.ProcessVariables(env, spec.Variables, "RegisterStruct", "member", "");
	
	let Struct = {$name: name}

	if(spec.Functions)
	{
		let keys = Object.keys(spec.Functions);
		for(let k = 0; k<keys.length; k++)
		{
			let kname = keys[k]
			let f = spec.Functions[kname];
			if(_validate_)
			{
				if(f === null)
					JEEP.impl.AddError("func-set-null", {name: kname, type: "member"});
				else if(typeof f !== 'function')
					JEEP.impl.AddError("func-not-function", {name: kname, type: "member"});
				else if(kname[0] == "$" || JEEP.impl.ReservedWords.indexOf(kname) >= 0)
					JEEP.impl.AddError("reserved-word-name", {type: "struct", what: "function", name: name, vname: kname})
			}
			Struct[kname] = f;
		}
	}

	if(_validate_ && !JEEP.impl.Errors.Empty())
		JEEP.impl.Abort({type: "struct", where: "RegisterStruct", reason: "The structure description syntax is wrong", className: name});

	let newImpl = function(args, cs)
	{
		let inst = {$def: Struct}
		JEEP.impl.SetupInstance({env: env, instSpec: cs, def: Struct, inst: inst, vars: vars, name: name})
		let funcs = Object.keys(Struct);
		for(let k = 0; k<funcs.length; k++)
			inst[funcs[k]] = Struct[funcs[k]];
		if(spec.CONSTRUCTOR)
			spec.CONSTRUCTOR.apply(inst, args ? args : []);
		return inst;
	}

	JEEP.impl.SetupDef(Struct)
	Struct.New = function()
	{
		let init = JEEP.impl.GetInitNewInfo(arguments)
		return (init) ? newImpl(null, init) : newImpl(arguments, null)
	}
	Struct.InitNew = function(init)
	{
		return newImpl(null, init)
	}

	if(noAdd)
		return Struct;

	JEEP.impl.ObjectDatabase.Add(Struct, name, "struct");
}


/*************************************************************/
/* Utils */
/*************************************************************/

JEEP.Utils.ShallowClone = function(src, dest){
	return JEEP.impl.ShallowClone(src, dest)
}

JEEP.Utils.DeepClone = function(src)
{
	let main = JEEP.Utils.ShallowClone(src)
	let keys = Object.keys(src);
	for(let k = 0; k<keys.length; k++)
	{
		let v = src[keys[k]];
		if(typeof v === 'object')
			main[keys[k]] = v ? JEEP.Utils.DeepClone(src[keys[k]]) : v;// copy null and undefined directly
	}
	return main;
}

JEEP.Utils.CopyProps = function(src, dest, names)
{
	names = names || Object.keys(src);
	for(let k = 0; k<names.length; k++)
		dest[names[k]] = src[names[k]];
}

JEEP.Utils.CopyDefinedProps = function(src, dest, names)
{
	names = names || Object.keys(src);
	for(let k = 0; k<names.length; k++)
	{
		let dp = Object.getOwnPropertyDescriptor(src, names[k]);
		Object.defineProperty(dest, names[k], dp);
	}
}

JEEP.Utils.Merge = function(src, dest)
{
	this.CopyProps(src, dest, Object.keys(src))
}

JEEP.Utils.GetKeyValueArray = function(obj)
{
	let ret = [];
	let keys = Object.keys(obj);
	for(let k = 0; k<keys.length; k++)
	{
		let key = keys[k];
		ret.push({key: key, value: obj[key]});
	}
	return ret;
}

JEEP.Utils.ForEachKey = function(obj, proc, resProc)
{
	let keys = Object.keys(obj);
	for(let k = 0; k<keys.length; k++)
	{
		let pair = {key: keys[k], value: obj[keys[k]]};
		let res = proc(obj, pair);
		if(resProc)
			resProc(obj, pair, res)
	}
}

JEEP.Utils.ObjectIterator = JEEP.impl.DoDefineStruct(null, true, "", {
	CONSTRUCTOR: function(obj){this.Reset(obj)},
	Variables: {
		obj: {},
		keys: [],
		pos: -1,
		pair: {},
	},
	Functions: {
		Reset: function(obj){
			this.obj = obj;
			this.keys = Object.keys(obj);
			this.pos = 0;
			this.pair = null;
		},
		Total: function(){
			return this.keys.length;
		},
		// returns true or false
		GetNext: function(){
			if(this.keys === null)
				return false;
			if(this.pos >= this.Total())
			{
				this.pair = null;
				return false;
			}
			let k = this.keys[this.pos++];
			this.pair = {key: k, value: this.obj[k]};
			return true;
		},
		GetCurrPair: function(){
			return this.pair;
		},
		GetCurrValue: function(){
			return this.pair ? this.pair.value : undefined;
		},
		GetCurrKey: function(){
			return this.pair ? this.pair.key : undefined;
		}
	}
});

JEEP.Utils.FlagProcessor = JEEP.impl.DoDefineStruct(null, true, "", {
	CONSTRUCTOR: function(flagMap){this.flagMap = flagMap},
	Variables: {flagMap: {}},
	Functions: {
		Process: function(info)
		{
			let flagArr = info.flags.split(",").map(function(item){return item.trim()})
			let err = [];
			let flags = 0;
			let fc = 0;
			for(let k = 0; k<flagArr.length; k++)
			{
				let d = flagArr[k];
				if(d.length == 0)
					continue;
				if(info.singleOnly && fc > 1)
					return null;
				fc++;
				let t = this.flagMap[d];
				if(t !== undefined)
					flags |= t;
				else if(info.markError)
					err.push(d);
			}
			return {errors: err, flags: flags}
		}
	}
});

JEEP.Utils.MessageFormatter = JEEP.impl.DoDefineStruct(null, true, "", {
	CONSTRUCTOR: function(map, tagChar){
		if(tagChar)
			this.tagChar = tagChar;
		this.setup(map)
	},
	Variables: {
		theMap: {},// msgid->{tag->{prefix}, tail}
		tagChar: "$",
	},
	Functions: {
		Get: function(id, tags){
			let fmt = this.theMap[id];
			if(fmt === undefined)
				throw new Error("MessageFormatter unable to format '"+id+"'");
			if(!tags)
				return fmt.tail;
			let msg = "";
			for(let k = 0; k<fmt.arr.length; k++)
			{
				let p = fmt.arr[k];
				msg += p.prefix + tags[p.arg];// allow junk like undefined if tags are setup wrong, its callers fault
			}
			if(fmt.tail)
				msg += fmt.tail;
			return msg;
		},
		setup: function(map){
			let iter = JEEP.Utils.ObjectIterator.New(map);
			while(iter.GetNext())
			{
				let pair = iter.GetCurrPair();
				let msg = pair.value;
				let t = pair.key[0];
				if(!((t >= 'A' && t <= 'Z')||(t >= 'a' && t <= 'z')))
					pair.key = pair.key.substring(1);
				else
					t = null;
				let mi = this.split(msg, t);
				if(mi === null)
					throw new Error("MessageFormatter unable to process '"+msg+"'");	
				this.theMap[pair.key] = mi;
			}
		},
		split: function(msg, tagChar){
			tagChar = tagChar || this.tagChar;
			let arr = [];
			let pos = 0;
			while(true)
			{
				let i = msg.indexOf(tagChar, pos);
				if(i < 0)
					break;// no more tags
				let j = msg.indexOf(tagChar, i+1);
				if(j < 0)
					break;// no tag end found, consider the char as part of the message
				let pref =  msg.substring(pos, i);
				let arg = msg.substring(i+1,j);
				arr.push({arg: arg, prefix: pref})
				pos = j+1;
			}
			let tail = "";
			if(pos != msg.length)
				tail = msg.substr(pos);
			return {arr: arr, tail: tail};
		}
	}
});


/*************************************************************/
/* implementation objects */
/*************************************************************/

// Even mutually exclusive flags are made orable for easier test and validation
// variable type, used for instantiation
JEEP.impl.VT_POD = 1;
JEEP.impl.VT_EMPTYOBJECT = 2;
JEEP.impl.VT_EMPTYARRAY = 4;
JEEP.impl.VT_OBJECT = 8;
// functions related
JEEP.impl.FUNC_ABSTRACT = 1;
JEEP.impl.FUNC_VIRTUAL = 2;
JEEP.impl.FUNC_REPLACE = 4;
JEEP.impl.FUNC_SCOPED = 8;
JEEP.impl.FUNC_CONSTANT = 16;
JEEP.impl.FUNC_ARGCONST = 32;
JEEP.impl.FUNC_ARGNUM = 64;
JEEP.impl.FUNC_STATIC = 128;// internal use
JEEP.impl.FUNC_USEPRIV = 256;
JEEP.impl.FUNC_WRAPPED = 512;// internal use
JEEP.impl.FUNC_PROTECTED = 1024;// internal use
JEEP.impl.FUNC_LAYERED = 1024*2;// internal use
JEEP.impl.FUNC_IMPL_DIRECTIVES = JEEP.impl.FUNC_LAYERED |JEEP.impl.FUNC_PROTECTED|JEEP.impl.FUNC_WRAPPED|JEEP.impl.FUNC_REPLACE|JEEP.impl.FUNC_SCOPED|JEEP.impl.FUNC_USEPRIV;// internal use
// variable related (continuum of function to detect wrong usage)
JEEP.impl.VAR_GETTER = 1024*16;
JEEP.impl.VAR_SETTER = 1024*32;
// variable access related
JEEP.impl.ACC_CONSTFUNC = 1;
JEEP.impl.ACC_INTERNALVARCHANGE = 2;
// class generation related
JEEP.impl.CLASS_MANUALBASECTOR = 1;
JEEP.impl.CLASS_ANCESTORACCESS = 2;
JEEP.impl.CLASS_INTERNALVARCHANGE = 4;
JEEP.impl.CLASS_CONSTFUNC = 8;// internal use
JEEP.impl.CLASS_REPLACEVIRTUAL = 16;
JEEP.impl.CLASS_USINGPRIVATE = 32;
JEEP.impl.CLASS_CTORUSINGPRIVATE = 64;
JEEP.impl.CLASS_TRAPVIRTUALCALL = 128;
JEEP.impl.CLASS_PROTECTEDACCESS = 256;
// environment related
JEEP.impl.ENV_DEVMODE = 0;// zero is easier and faster to test
JEEP.impl.ENV_DEVMODEFLAG = 1;// for flag proc only, because ENV_DEVMODE can't be detected
JEEP.impl.ENV_PRODMODE = 2;
JEEP.impl.ENV_CLIENT_JEEPAWARE = 4;
JEEP.impl.ENV_CLIENT_JEEPAGNOSTIC = 8;
JEEP.impl.ENV_RETAIN_CONST = 256;
JEEP.impl.ENV_RETAIN_ABSCHECK = 256*2;
JEEP.impl.ENV_RETAIN_INTVARCHANGE = 256*4;
JEEP.impl.ENV_RETAIN_NUMARG = 256*8;
JEEP.impl.ENV_RETAIN_ARGCONST = 256*16;
JEEP.impl.ENV_RETAIN_VIRTUALTRAP = 256*32;
JEEP.impl.ENV_RETAIN_ARGTYPES = 256*64;
JEEP.impl.ENV_RETAIN_PROTECTED = 256*128;
JEEP.impl.ENV_RETAIN_CHANGE = 256*256;
// undecoration related
JEEP.impl.UNDECFUNC = 1;
JEEP.impl.UNDECVAR = 2;

// some regexes
JEEP.impl.rxFuncArg = /([\w\.\?]+),*/g;
JEEP.impl.rxEmptyfunction = /function\s*\(.*\)\s*\{\s*\}/;

JEEP.impl.DeclarationProperties = [
"Flags", "BaseClass", "CrBaseClass",
"CONSTRUCTOR", "DESTRUCTOR",
"Functions", "Variables", "Protected", "Private", "Static",
];

JEEP.impl.Library = {};

JEEP.impl.EnvDirectives = JEEP.Utils.FlagProcessor.New({
	"development-mode": JEEP.impl.ENV_DEVMODEFLAG, 
	"production-mode": JEEP.impl.ENV_PRODMODE,
	"jeep-aware":  JEEP.impl.ENV_CLIENT_JEEPAWARE,
	"jeep-agnostic":  JEEP.impl.ENV_CLIENT_JEEPAGNOSTIC,
	"retain-const": JEEP.impl.ENV_RETAIN_CONST,
	"retain-argnum": JEEP.impl.ENV_RETAIN_NUMARG,
	"retain-argconst": JEEP.impl.ENV_RETAIN_ARGCONST,
	"retain-argtypes": JEEP.impl.ENV_RETAIN_ARGTYPES,
	"retain-protected": JEEP.impl.ENV_RETAIN_PROTECTED,
	"retain-abstract-check": JEEP.impl.ENV_RETAIN_ABSCHECK,
	"retain-init-change-check": JEEP.impl.ENV_RETAIN_CHANGE,
	"retain-internal-varchange": JEEP.impl.ENV_RETAIN_INTVARCHANGE,
	"retain-invalid-virtual-trap": JEEP.impl.ENV_RETAIN_VIRTUALTRAP,
});

JEEP.impl.ClassFlags = JEEP.Utils.FlagProcessor.New({
	"constructor-using-private-members": JEEP.impl.CLASS_CTORUSINGPRIVATE, 
	"trap-invalid-virtual-call": JEEP.impl.CLASS_TRAPVIRTUALCALL,
	"replace-virtual-functions": JEEP.impl.CLASS_REPLACEVIRTUAL,
	"internal-variable-change": JEEP.impl.CLASS_INTERNALVARCHANGE,
	"manual-base-construction": JEEP.impl.CLASS_MANUALBASECTOR, 
	"using-private-members": JEEP.impl.CLASS_USINGPRIVATE, 
	"need-ancestor-access": JEEP.impl.CLASS_ANCESTORACCESS,
});

JEEP.impl.FuncDirectivesMap = {
	"const": JEEP.impl.FUNC_CONSTANT, 
	"argnum": JEEP.impl.FUNC_ARGNUM,
	"scoped": JEEP.impl.FUNC_SCOPED,
	"usepriv": JEEP.impl.FUNC_USEPRIV,
	"replace": JEEP.impl.FUNC_REPLACE,
	"virtual": JEEP.impl.FUNC_VIRTUAL, 
	"abstract": JEEP.impl.FUNC_ABSTRACT, 
	"argconst": JEEP.impl.FUNC_ARGCONST, 
};
JEEP.impl.FuncDirectives = JEEP.Utils.FlagProcessor.New(JEEP.impl.FuncDirectivesMap);

JEEP.impl.VarDirectives = JEEP.Utils.FlagProcessor.New({
	"get": JEEP.impl.VAR_GETTER, 
	"set": JEEP.impl.VAR_SETTER,
});

JEEP.impl.ErrorList = JEEP.impl.DoDefineStruct(null, true, "", {
	CONSTRUCTOR: function(){this.Reset()},
	Variables: {arr: []},
	Functions: {
		Reset: function(){this.arr = [""];},
		Add: function(a){this.arr.push(a);},
		Empty: function(){return this.arr.length == 1;},
		Text: function(){return this.arr.join("\n  ");},
	}
});

JEEP.impl.Errors = JEEP.impl.ErrorList.New();

JEEP.impl.DuplicateDetector = JEEP.impl.DoDefineStruct(null, true, "", {
	CONSTRUCTOR: function(type){
		this.type = type;
	},
	Variables: {
		map: {},
		type: "",
	},
	Functions: {
		Add: function(key, src, ndi){
			let info = this.map[key];
			info = info || {arr:[], nondupInfo: []};
			if(info.arr.indexOf(src) < 0)
				info.arr.push(src);
			if(ndi && info.nondupInfo.indexOf(ndi) < 0)// assuming ndi is non object
				info.nondupInfo.push(ndi)
			this.map[key] = info;
		},
		Process: function(proc){// proc returns true to delete the pair
			JEEP.Utils.ForEachKey(this.map, proc, this.resProc)
		},
		GenerateError: function(){
			let generated = false;
			let mobj = JEEP.Utils.ObjectIterator.New(this.map);
			while(mobj.GetNext())
			{
				let pair = mobj.GetCurrPair();
				let info = pair.value;
				generated |= (info.arr.length > 1);
				if(info.arr.length > 1)
					JEEP.impl.Errors.Add("The " + this.type+ " '"+ pair.key + "' is declared multiple times in the hierarchy [" + info.arr.join(", ") + "]");
			}
			return generated;
		},
		resProc: function(obj, pair, res){
			if(res === true)
				delete obj[pair.key]
		}
	}
});

// This is a 'pre instantiated' object, so no need of being struct
JEEP.impl.ScopeStack = {
	arr: [],
	pos: 0,
	Mark: function(){
		this.Add(null);
	},
	IsMarked: function(){
		return this.pos > 0;
	},
	Add: function(obj){
		this.arr.push(obj);
		this.pos = this.arr.length;
	},
	Unwind: function(){
		if(this.pos == 0)
			return;
		while(--this.pos)
		{
			let obj = this.arr[this.pos];
			if(obj == null)
				break;
			if(obj.DESTRUCTOR)
				try{obj.DESTRUCTOR()}catch(e){}// should this be reported?
		}
		this.arr = this.arr.slice(0, this.pos);
		this.pos = this.arr.length;
	},
};

// This is a 'pre instantiated' object, so no need of being struct
JEEP.impl.ObjectDatabase = {
	database: {Class: {}, Struct: {}, Record: {}, Decl: {}},
	Add: function(def, name, type){
		let src = this.getSrc(type);
		if(src !== null)
			src[name] = def;
	},
	Get: function(name, type){
		let src = this.getSrc(type);
		if(src === null)
			return undefined;
		return src[name];
	},
	Delete: function(name, type){
		let src = this.getSrc(type);
		if(src !== null && src[name])
			delete src[name];
	},
	Reset: function(){
		this.database = {Class: {}, Struct: {}, Record: {}, Decl: {}};
	},
	getSrc: function(type){// private
		switch(type)
		{
			case "class": return this.database.Class;
			case "struct": return this.database.Struct;
			case "record": return this.database.Record;
			case "decl": return this.database.Decl;
		}
		return null;
	}
};

JEEP.impl.VTableRecord = JEEP.impl.DoDefineRecord(null, true, "", {
	orig: "",
	type: 0,
	argcount: 0,
	argtype: "",
	reinfOrig: "",// valid for abstract type
	baseVF: null,// valid for virtual type
	ownVF: null,// valid for virtual type
})

JEEP.impl.ArgTypeRecord = JEEP.impl.DoDefineRecord(null, true, "", {
	pos: 0,
	type: "",
	jeepObjectType: "",
})

JEEP.impl.ErrorMessages = JEEP.Utils.MessageFormatter.New({
	"abort-reason": "JEEP aborting from $where$. $reason$.",
	"abort-reason-runtime": "JEEP aborting due to run time error. $reason$.",
	"abort-reason-objname": "JEEP aborting from $where$ $objType$ [$objName$]. $reason$.",
	"abort": "JEEP couldn't generate the $type$ [$className$] due to the following errors.",
	"abort-runtime": "JEEP run time error [$type$ $className$]. $reason$.",
	"abort-where": "JEEP error in $where$ for $type$ [$className$]. $reason$.",
	"abort-noclass": "JEEP aborting due to the following errors in $where$.",
	"record-func": "The record [$name$] defines the function '$func$'.",
	"reserved-word-name": "The $type$ [$name$] uses the reserved word '$vname$' for $what$ name",
	"invalid-api-arg": "The function expects a valid name and a valid description object",
	"invalid-class-desc": "The class description information '$name$' is invalid",
	"invalid-flags": "The flags '$which$'' is invalid",
	"manual-base-construction": "The flag 'manual-base-construction' can be used only when a class has base classes",
	"ctor-defined-not-declered": "The function 'CONSTRUCTOR' is defined but not declared",
	"base-base-of-base": "The base class '$parent$' is the base of another base class '$child$'",
	"invalid-directive": "The directive '$which$' for the $type$ '$name$' is invalid",
	"invalid-func-directive-declare": "The function '$name$' uses the directive '$which$' which is not allowed in declare as it is an implementation detail",
	"var-not-object": "The $type$ variable '$name$' is not an object",
	"var-set-undefined": "The $type$ variable '$name$' is set to undefined",
	"var-invalid-directives": "The variable '$name$' uses invalid directives",
	"arg-invalid-directives": "The argument '$arg$' in the function '$func$' uses invalid directives",
	"func-virtual-somebase": "The function '$name$' is declared virtual in some bases [$vbases$] but not in some bases [$nvbases$]" ,
	"func-set-null": "The $type$ function '$name$' is set to null",
	"func-not-function": "The $type$ function '$name$' is not a function",
	"func-invalid-type": "The $which$ function '$name$' is declared $type$",
	"func-not-empty": "The $type$ function '$name$' spans lines or contains implementation",
	"func-virtual-abstract": "The function '$name$' uses both 'virtual' and 'abstract' directives",
	"func-invalid-replace": "The function '$name$' is not virtual but uses the 'replace' directive",
	"getter-setter-present": "Unable to generate the $type$ for the variable '$name$' as the function '$which$' already exists",
	"getter-setter-defined-not-declared": "The $type$ for the variable '$name$' is defined but not declared",
	"func-argcount-mismatch-baseder": "The argument count for the $type$ function '$name$' is declared as $base-count$ in base class [$base$] but as $der-count$ in derived class [$derived$]",
	"func-argtype-mismatch-baseder": "The argument type for the function '$name$' is declared as '$base-type$' in base class [$base$] but as '$der-type$' in derived class [$derived$]",
	"func-decl-mismatch-baseder": "The function '$name$' is declared '$decl$' in $where$ class [$class-name$] but not in $not-where$ class [$not-where-name$]",
	"func-virt-decl-mismatch-baseder": "The virtual function '$name$' is declared as '$base-decl$' in base class [$base-name$] but as '$der-decl$' in derived class [$der-name$]",
	"func-declared-not-defined": "The function '$name$' is declared but not defined",
	"func-argcount-mismatch-decdef": "The argument count for the function '$name$' is declared as $decl-count$ but defined as $def-count$",
	"func-decl-mismatch-decdef": "The function '$name$' is declared as '$decl-type$' but defined as '$def-type$'",
	"abstract-implemented": "The abstract function '$name$' is implemented in the same class",
	"abstract-argcount-mismatch": "The abstract function '$name$' is declared with $base-count$ arguments in base classs [$base$] but declared with $reinf-count$ while reinforcing in class [$reinf$]",
	"abstract-directives": "The abstract function '$name$' uses extra directives",
	"func-virtual-common-ambiguous": "The virtual function '$name$' is ambiguous as it is present in multiple base classes [$bases$]",
	"func-replace-nobase": "The class [$name$] does not have base classes but uses the directive 'replace' for the function '$func$'",
	"func-replace-nobase-virt": "The class [$name$] replaces the virtual function '$func$' though it is not present in any of its bases",
	"invalid-virtual-call": "The virtual function '$func$' was invoked from the $where$",
	"vars-novars": "The class has no variables to need init constructor",
	"invalid-vars": "These vars given to init constructor are invalid [$vars-list$]",
	"invalid-env": "The expected parameter is an object with two string properties, mode and flags",
	"invalid-env-flags": "The env flags are invalid '$flags$",
	"private-nouse": "The class declares private members but does not use them",
	"private-non-existing": "The class declares usage of non existing private members",
	"invalid-argtype-decl-split": "The argument type for the function '$func$' is declared as '$decl-type$' but defined as '$def-type$'",
	"invalid-argtype-decl": "The function '$func$' uses invalid type '$type$' for the argument $argpos$",
	"invalid-argtype-func": "Argument type information is declared for a non existing function '$func$'",
	"invalid-argtype-decl-count": "The function '$func$' declares $argcount$ number of arguments but declares type for $typecount$",
	"invalid-argtype-count": "The function '$func$' expects $count$ number of argument(s)",
	"invalid-argtype": "The function '$func$' expects '$type$' type for argument $argpos$",
	"invalid-argtype-jobj": "The function '$func$' expects '$type$' type for argument $argpos$ but it is not registered",
	"no-argtype": "The function '$func$' uses the argtype directive but specifies no type for its arguments",
	"alias-exists": "The $type$ '$alias$' already exists in the namespace '$where$'",
	"own-abstract-not-implemented": "The abstract function '$func$' is not implemented",
	"own-reinf-abstract-not-implemented": "The abstract function '$func$' declared in base [$base$] and reinforced in the class is not implemented",
	"base-abstract-not-implemented": "The abstract function '$func$' declared in base [$base$] is not implemented",
	"reinf-abstract-not-implemented": "The abstract function '$func$' declared in base [$base$] and reinforced in base [$reinf$] is not implemented",
	"ns-partition-exists": "The namespace '$name$' already has the partition '$part$'",
	"env-expects": "The function expects a valid $which$ parameter",
	"env-flags-invalid": "The flags '$flags$' is invalid",
	"object-accessor": "The $type$ '$name$' is not registered",
	"object-reg-name": "The name '$name$' is invalid. Names must be English alphanumeric, starting with a letter. Only underscored are allowed as symbols",
	"object-registered": "The $type$ '$name$' is already registered",
	"noname-makefunc": "The given function must have a name so that in case of violation the error messages be meaningful and useful",
	"constructor-name": "The constructor function must not have a name",
	"wrap-invalid-spec": "The specification given is invalid",
	"wrap-invalid-name": "The $type$ '$name$' does not exist in the class [$className$]",
	"prot-pub": "The $what$ '$name$' is declared as both public and protected",
	"prot-base-der-pub": "The protected function '$func$' declared in base class [$base$] is declared as public in derived class [$derived$]",
	"prot-der-base-pub": "The public function '$func$' declared in base class [$base$] is declared as protected in derived class [$derived$]",
	"prot-base-virt-der-novirt": "The protected virtual function '$func$' declared in base class [$base$] is declared as non virtual in derived class [$derived$]",
	"prot-base-novirt-der-virt": "The protected non virtual function '$func$' declared in base class [$base$] is declared as virtual in derived class [$derived$]",
	"prot-var-decl": "Protected variables are not allowed to be declared",
	"prot-plain-func": "Only virtual and abstract protected functions are allowed to be declared",
	"prot-var-getset": "Protected variables cannot have get and set directives",
	"prot-access": "The $what$ '$name$' of the class [$className$] is protected and not accessible directly",
	"prot-decl-nodef": "The protected function '$func$' is declared but not defined",
	"library-present": "A library by the name '$name$' is already registered",
	"library-absent": "The library by the name '$name$' is not registered",
	"invalid-lib-reg-arg": "The function expects a valid string, a valid function and an optional object as arguments",
	"invalid-lib-reg-func": "Cannot register a non function for the library '$name$'",
	"-invalid-lib-reg-param": "The parameter for the library '-name-' contains the reserved word '$name'",
	"invalid-lib-init-arg": "The function expects exactly one argument which must be a valid string",
});

JEEP.impl.stderr = console.log;
