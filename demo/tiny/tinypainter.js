// Created by Vinay.M.S as a part of demonstration for the JEEP framework.
// Usable subject to MIT license

function InitTinyPainterLib(env)
{
	let Lib = env.CreateNamespace("TinyPainterLib")	

	Lib.RegisterStruct("Line", {
		Variables: {
			xa: 0,
			ya: 0,
			xb: 0,
			yb: 0,
			color: ""
		},		
	})
	Lib.RegisterStruct("Rectangle", {
		Variables: {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			fillColor: "",
			lineColor: "",
		},		
	})
	Lib.RegisterStruct("Text", {
		Variables: {
			x: 0,
			y: 0,
			content: "",
			color: "",
			font: "",
			boundHeight: 0,
		},		
	})

	Lib.DeclareClass("Painter", {
		CONSTRUCTOR: function(canvas){},
		Functions: {
			GetCanvasElement: function(){},
			Reset: function(){},
			AddLine: function(line){},
			AddRectangle: function(rect){},
			AddText: function(text){},
		},
	})

	let clib = InitTinyCanvasLib(env);
	Lib.DefineClass("Painter", {
		Variables: {
			canvas: null,
			Point: null,		
			TextProp: "",	
		},
		CONSTRUCTOR: function(canvas){
			let Canvas = clib.GetClass("CanvasXY");
			this.canvas = new Canvas(canvas);
			this.Point = clib.GetStruct("Point");
			this.TextProp = clib.GetRecord("TextProperty");
		},
		Functions: {
			GetCanvasElement: function(){return this.canvas.GetCanvasElement()},
			Reset: function(){this.canvas.Clear()},
			AddLine: function(line){
				this.canvas.DrawLine(
					this.Point.InitNew({x: line.xa, y: line.ya}),
					this.Point.InitNew({x: line.xb, y: line.yb}),
					line.color,
				)
			},
			AddRectangle: function(rect){
				this.canvas.DrawBox(
					this.Point.InitNew({x: rect.x, y: rect.y}),
					this.Point.InitNew({x: rect.x+rect.width, y: rect.y+rect.height}),
					rect.fillColor
				)
			},
			AddText: function(text){
				this.canvas.DrawText(
					this.Point.InitNew({x: text.x, y: text.y}),
					text.content,
					this.TextProp.New({font: text.font, color: text.color, boundHeight: text.boundHeight})
				);
			}
		},
	})

	return Lib
}