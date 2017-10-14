// Created by Vinay.M.S as a part of demonstration for the JEEP framework.
// Usable subject to MIT license

function InitTinyCanvasLib(env)
{
	let Lib = env.CreateNamespace("TinyCanvasLib")

	Lib.RegisterStruct("Point", {
		Variables: {
			x: 0, 
			y: 0
		},
		Functions: {
			GetDistanceFrom: function(other){
				if(!this.$def.InstanceOf(other))
					return null;
				return {width: Math.abs(this.x - other.x), height: Math.abs(this.y-other.y)}
			}
		}
	})

	Lib.RegisterRecord("TextProperty", {
		font: "14pt Verdana",
		color: "black",
		align: "center",
		boundHeight: 0,
	})

	Lib.DeclareClass("CanvasXY", {
		CONSTRUCTOR: function(canvas){},
		Functions: {
			GetCanvasElement: function(){},
			Clear: function(){},
			DrawLine: function(start, end, color){},
			DrawBox: function(topleft, rightbottom, color){},
			DrawText: function(at, text, prop){}
		}
	})

	Lib.DefineClass("CanvasXY", {
		Variables: {
			$get$__canvasElement: null,
			ctx: null,
			savedProps: {},
			savedPropNames: ["strokeStyle", "fillStyle", "textAlign"],
			TextProp: Lib.GetRecord("TextProperty"),
		},
		CONSTRUCTOR: function(canvas){
			this.canvasElement = canvas || document.createElement("canvas");
			this.canvasElement.style.border = "1px solid gray"
			this.ctx = this.canvasElement.getContext('2d');
		},
		Functions: {
			Clear: function(){this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)},
			DrawLine: function(start, end, color){
				if(color) this.saveProps()
				if(color) this.ctx.strokeStyle = color;
				this.ctx.beginPath();
				this.ctx.moveTo(start.x, start.y)
				this.ctx.lineTo(end.x, end.y)
				this.ctx.stroke();
				this.ctx.closePath();
				if(color) this.restoreProps()
			},
			DrawBox: function(topleft, rightbottom, color){
				if(color) this.saveProps()
				let distance = topleft.GetDistanceFrom(rightbottom)
				if(color)
				{
					this.ctx.fillStyle = color;
					this.ctx.fillRect(topleft.x, topleft.y, distance.width, distance.height)
				}
				else
				{
					this.ctx.strokeRect(topleft.x, topleft.y, distance.width, distance.height)
				}
				if(color) this.restoreProps()
			},
			DrawText: function(at, text, prop){
				if(prop) this.saveProps()
				if(prop && this.TextProp.InstanceOf(prop))
				{
					this.ctx.fillStyle = prop.color;
					this.ctx.textAlign = prop.align;
					this.ctx.font = prop.font;
				}
				let y = at.y;
				if(prop && prop.boundHeight)
				{
				}
				this.ctx.fillText(text, at.x, y);
				if(prop) this.restoreProps()
			},
			saveProps: function(){
				JEEP.Utils.CopyProps(this.ctx, this.savedProps, this.savedPropNames)
			},
			restoreProps: function(){
				JEEP.Utils.CopyProps(this.savedProps, this.ctx, this.savedPropNames)
			}
		}
	})

	return Lib;
}