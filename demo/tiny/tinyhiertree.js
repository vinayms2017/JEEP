// Created by Vinay.M.S as a part of demonstration for the JEEP framework.
// Usable subject to MIT license

function InitTinyHierTree(Env, PainterLib)
{
	let Lib = Env.CreateNamespace("TinyHierTree")

	Lib.DeclareClass("Tree", {
		CONSTRUCTOR: function(boundWidth, script){},
		Functions: {
			Paint: function(painter){},		
			Reset: function(script, painter){},	
		}
	})

	let Line = PainterLib.GetStruct("Line")
	let Rectangle = PainterLib.GetStruct("Rectangle")
	let Text = PainterLib.GetStruct("Text")

	let FF_NONE = 0;
	let FF_MEMBER = 1;
	let FF_VIRTUAL = 2;
	let FF_ABSTRACT = 3;
	let FF_VIRTUALDUP = 4;
	let FF_ABSTRACTDUP = 5;
	let FF_IMPLEMENT = 6;

	let Node = Env.Object.CreateRecord("Node", {
		name: "",	children: [], 
		x: -1, y: -1, lowCount: 0,
		flag: FF_NONE
	})
	let LevInfo = Env.Object.CreateRecord("LevT", {nodes: [], y: -1})

	Lib.DefineClass("Tree", {
		CONSTRUCTOR: function(bw, script){
			this.mainPattern = /(\-*\$*\.?\w+)\[([\w+,\s\-*]+)\]/g;
			this.nodePattern = /\s*(\-*\w+)\s*,?/g;
			this.boundWidth = bw;
			script = script || "$aTop[MidA,MidB] vMidA[Der] MidB[Der]"
			this.Reset(script)
		},
		Variables: {
			nodes: {},
			dup: {},
			root: null,
			nodeWidth: 75,
			nodeHeight: 25,
			rowGap: 15,
			width: 0,
			boundWidth: 0,
			mainPattern: null,
			nodePattern: null,
			decoration: "abvwmq",
		},
		Functions: {
			Paint: function(painter){
				this.paint(this.root.children, painter)
			},
			Reset: function(script, painter){	
				let rootNode = Node.New({name: "$"})
				let build = {}
				let main = null;
				while(main = this.mainPattern.exec(script))
				{
					let ret = this.createNode(build, main[1]);
					let node = ret.node;
					if(ret.root)
						rootNode.children.push(node.name);
					let n = null
					while(n = this.nodePattern.exec(main[2]))
					{
						let cnr = this.createNode(build, n[1])
						node.children.push(cnr.node.name)
					}					
				}
				build[rootNode.name] = rootNode;
				this.root = rootNode;
				this.nodes = build;
				this.init();
				if(painter)
				{
					painter.Reset();
					this.Paint(painter)
				}
			},
			createNode: function(build, name){
				let ret = this.processName(name)
				let node = build[ret.name]
				if(!node)
				{
					node = Node.New({name: ret.name, lowCount: ret.lowCount});
					build[ret.name] = node;
				}
				if(ret.flag)
					node.flag = ret.flag;
				if(ret.lowCount)
					node.lowCount = ret.lowCount;
				return {root: ret.root, node: node};
			},
			processName: function(n)
			{
				let ret = {root: false, name: n, flag: FF_NONE, lowCount: 0};
				if(n[0] == '-')
				{
					let pos = 0;
					while(pos < n.length && n[pos] == '-')pos++;
					if(pos < n.length)
					{
						ret.name = ret.name.substr(pos)
						ret.lowCount = pos;
					}
				}
				if(ret.name[0] == '$')
				{
					ret.root = true;
					ret.name = ret.name.substr(1);
				}
				if(ret.name[0] == '.')
				{
					let c = this.dup[ret.name];
					c = c || 0;
					this.dup[ret.name] = ++c;
					ret.name = ret.name.substr(1)+"."+c+"."// a hack to accommodate duplicate names
				}
				let c = ret.name[0]
				if(this.decoration.indexOf(c)>=0)
				{
					ret.name = ret.name.substr(1);
					switch(c){
						case 'a': ret.flag = FF_ABSTRACT; break;
						case 'b': ret.flag = FF_ABSTRACTDUP; break;
						case 'v': ret.flag = FF_VIRTUAL; break;
						case 'w': ret.flag = FF_VIRTUALDUP; break;
						case 'm': ret.flag = FF_MEMBER; break;
						case 'q': ret.flag = FF_IMPLEMENT; break;
					}
				}
				return ret;
			},
			init: function(){
				let levinfo = {}
				this.getLevelWidth(this.root.children, 1, levinfo)

				let keys = Object.keys(levinfo)
				let tw = 0
				let y = this.nodeHeight;
				let lowy = 0;
				for(let k = 0; k<keys.length; k++)
				{
					let li = levinfo[keys[k]]

					let w = li.nodes.length
					if(w > tw)
						tw = w;
					
					li.y = y + (k>0 ?this.rowGap + this.nodeHeight:0)
					for(let j = 0; j<li.nodes.length; j++)
					{
						let node = this.nodes[li.nodes[j]]
						if(node.lowCount)
							node.y = li.y + (node.lowCount)*this.nodeHeight;
						else
							node.y = li.y
						if(lowy < node.y)
							lowy = node.y
					}
					y = lowy + this.rowGap;
				}
				this.width = tw;
				
				this.setXPos(this.root.children, 1, levinfo, {})
			},
			getLevelWidth: function(nodeNames, lev, levinfo)
			{
				let li = levinfo[lev];
				if(!li)
				{
					li = LevInfo.New({})
					levinfo[lev] = li;
				}
				for(let k = 0; k<nodeNames.length; k++)
				{
					let n = nodeNames[k]
					if(li.nodes.indexOf(n) < 0)
						li.nodes.push(n)
				}
				for(let k = 0; k<nodeNames.length; k++)
				{
					let node = this.nodes[nodeNames[k]]
					this.getLevelWidth(node.children, lev+1, levinfo)
				}
			},
			setXPos: function(nodeNames, lev, levinfo, levx)
			{
				let li = levinfo[lev];
				let nc = li.nodes.length
				let x = levx[lev] || 0
				let w = this.boundWidth/(nc+1)
				for(let k = 0; k<nodeNames.length; k++)
				{
					let node = this.nodes[nodeNames[k]]
					if(node.x < 0)
						node.x = (x+k+1)*w-this.nodeWidth/2
					if(node.children)
						this.setXPos(node.children, lev+1, levinfo, levx)
				}
				if(nodeNames.length > 0)
					levx[lev] = (levx[lev] || 0) + nodeNames.length
			},
			paint: function(nodeNames, painter)
			{
				for(let k = 0; k<nodeNames.length; k++)
				{
					let node = this.nodes[nodeNames[k]]
					let color = ""
					let txcolor = "black"
					switch(node.flag){
						case FF_MEMBER: color = "lightblue"; txcolor = "blue"; break;
						case FF_VIRTUAL: color = "#feebab"; txcolor = "black"; break;
						case FF_ABSTRACT: color = "lightcoral"; txcolor = "white"; break;
						case FF_VIRTUALDUP: color = "#feebab"; txcolor = "red"; break;
						case FF_ABSTRACTDUP: color = "lightcoral"; txcolor = "yellow"; break;
						case FF_IMPLEMENT: color = "gray"; txcolor = "white"; break;
					}
					painter.AddRectangle(Rectangle.InitNew({
						x: node.x, y: node.y,
						width: this.nodeWidth, height: this.nodeHeight, 
						fillColor: color,
					}))
					let name = node.name;
					// remove dot suffix if any that will be added to accomodate duplicate names
					let dot = name.indexOf('.');
					if(dot >= 0)
						name = name.substring(0, dot);
					painter.AddText(Text.InitNew({
						x: node.x+this.nodeWidth/2, y: node.y+this.nodeHeight/2+5, // hacked value to center for the given font
						content: name, 
						color: txcolor, font: "14px consolas", 
						boundHeight: this.nodeHeight
					}))
					if(node.children)
					{
						this.paint(node.children, painter)
						for(let k = 0; k<node.children.length; k++)
						{
							let cn = this.nodes[node.children[k]]
							painter.AddLine(Line.InitNew({
								xa: node.x+this.nodeWidth/2, ya: node.y+this.nodeHeight, 
								xb: cn.x+this.nodeWidth/2, yb: cn.y, color: "gray"
							}))
						}
					}
				}
			},
		}
	})

	return Lib;
}