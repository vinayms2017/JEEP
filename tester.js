/*
 --------------------------------------------------------------------
 Designed and Developed by Vinay.M.S
 --------------------------------------------------------------------
 Last Change: 2017 August 14
 
 An extremely simple testing utility. This can be (and is) used to build
 more elaborate mechanisms. 

 Usage is quite simple. 
 
 1. Initialize the Tester mechanism by calling Tester.Init
 2. Create a case with name, description, aspects and expected results by calling Tester.NewCase
 3. From within the test code, add generated results to the case by calling Case.AddGenerated
 4. When test code finishes run the test by calling Case.Compare
 5. Optionally add the aspects browser by calling Tester.CreateAspectsBrowser
 6. The same case can be reused by calling Case.Reset.
 
 There are some utilities in Tester.Utils that are unrelated to testing itself, but are useful in 
 creating and formatting dom elements.

 1. CreateDiv
 2. CreateResultDiv
 3. CreateFailList
 4. CreateTimeStamp
 5. PadTextRows
 6. GetFormattedText
 7. CreateTable

 Coding convention:
		names beginning with lower case are private
		names beginning with upper case are public
 
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

Tester = {
	Init: function(){
		this.counter = 0;
		this.aspmap = {};
	},
	NewCase: function(test){
		return new Tester.Case(test);
	},
	CreateAspectsBrowser: function(){
		let asparr = Object.keys(this.aspmap);
		if(asparr.length == 0)
			return null;

		let div = Tester.Utils.CreateDiv({add: true})
		div.id = "aspects-browser";
		div.style.width = "20%";
		div.style.position = "fixed";
		div.style.bottom = "0";
		div.style.right = "0";
		div.style.border = "1px solid gray";
		div.style.margin = "5px";
		div.style.fontSize = "15px";
		div.style["font-family"] = "initial";

		let title = document.createElement('span')
		title.textContent = "Aspects Tested";
		title.style.display = "block";
		title.style.padding = "3px";
		title.style.textAlign = "center";
		title.style.backgroundColor = "lightgray";
		div.appendChild(title);

		let listdiv = document.createElement("div");
		listdiv.style.height = "15em";// about 15 lines
		listdiv.style.overflowY = "auto";
		div.appendChild(listdiv);
		let list = document.createElement("ol")
		list.style.margin = "0";
		list.style["margin-right"] = "1em";
		listdiv.appendChild(list);

		let btnColor = "gray";

		let navig = document.createElement("div");
		navig.style.padding = "5px 0";
		navig.style.textAlign = "center";
		navig.style.marginTop = "5px";
		navig.style.border = "1px solid lightgray";
		let curr = document.createElement("span");
		curr.style.padding = "0 5px";
		curr.style.minWidth = "5em";
		curr.style.fontSize = "12px";
		let next = document.createElement("span");
		this.setNavigButtonStyle(next, btnColor);
		next.style.padding = "0 2px";
		next.style.margin = "0;"
		next.textContent = "next";
		next.title = "Navigates to next test that includes the selected aspect";
		let prev = document.createElement("span");
		this.setNavigButtonStyle(prev, btnColor);
		prev.style.padding = "0 2px";
		prev.style.margin = "0;"
		prev.textContent = "prev";
		prev.title = "Navigates to previous test that includes the selected aspect";
		let sort = document.createElement("span");
		this.setNavigButtonStyle(sort, btnColor);
		sort.style.padding = "0 2px";
		sort.style.margin = "0;"
		sort.style.color = "white"
		sort.textContent = "Sort by count";
		sort.title = "Toggles between sorting aphabetically and in descending order of number of tests";
		sort.asporder = "alpha";
		navig.appendChild(sort);
		navig.appendChild(curr);
		navig.appendChild(prev);
		navig.appendChild(next);
		div.appendChild(navig);

		let currAspPos = -1;
		let currAspArr = null;
		let currAspLi = null;
		let markColor = "lightblue";
		let liarr = [];// store the li elements for reuse when sorted differently
		// pre create li elements, the number remains the same only order varies
		for(let k = 0; k<asparr.length; k++)
		{
			let li = document.createElement("li");
			li.style.cursor = "pointer";
			li.style.padding = "0 5px";
			li.onclick = onliclick;
			liarr.push(li);
		}

		function fillList(alpha)
		{
			if(alpha)
				asparr.sort();
			else
				asparr.sort(function(a,b){return Tester.aspmap[b].length - Tester.aspmap[a].length})
			let currId = "";
			if(currAspLi)
			{
				currId = currAspLi.aspid;
				currAspArr = Tester.aspmap[currId];
			}
			if(currAspArr)
				showAspTest(false);
			for(let k = 0; k<asparr.length; k++)
			{
				let li = liarr[k]
				let idarr = Tester.aspmap[asparr[k]];
				li.textContent = asparr[k] + " (" + idarr.length + ")";
				li.aspid = asparr[k];
				li.idarr = idarr;
				if(li.aspid == currId)
				{
					li.style.backgroundColor = markColor;
					currAspLi = li;
				}
				else
					li.style.backgroundColor = "white";
				list.appendChild(li);
			}
			if(currAspArr)
				showAspTest(true);
		}

		function showAspTest(mark){
			let id = currAspArr[currAspPos];
			document.location.href = "#"+id
			let div = document.getElementById(id);
			div.style.backgroundColor = mark ? markColor : "white";
			curr.textContent = mark ? (currAspPos+1)+"/"+currAspArr.length : "";
		}
		function enableButton(enable, btn, func){
			btn.onclick = enable ? func : null;
			btn.style.backgroundColor = enable ? btnColor : "lightgray"
		}
		function onnext(e){
			if(currAspPos < currAspArr.length-1)
			{
				enableButton(true, prev, onprev);
				showAspTest(false);
				currAspPos++;
				showAspTest(true);
			}
			enableButton(currAspPos < currAspArr.length-1, next, onnext);
		}
		function onprev(e){
			if(currAspPos > 0)
			{
				enableButton(true, next, onnext);
				showAspTest(false);
				currAspPos--;
				showAspTest(true);
			}
			enableButton(currAspPos > 0, prev, onprev);
		}
		function onliclick(e){
			if(currAspLi)
				currAspLi.style.backgroundColor = "white";
			let idarr = this.idarr;
			currAspLi = this;
			currAspLi.style.backgroundColor = markColor;
			if(currAspPos >= 0)
				showAspTest(false);
			currAspArr = idarr;
			currAspPos = 0;
			showAspTest(true);
			enableButton(false, prev);
			enableButton(idarr.length > 1, next, onnext);
		}

		prev.onclick = onprev;
		next.onclick = onnext;
		sort.onclick = function(){
			while (list.firstChild) {
			    list.removeChild(list.firstChild);
			}		
		    sort.asporder = (sort.asporder == "alpha") ? "count" : "alpha";
		    sort.textContent = (sort.asporder == "alpha") ? "Sort by count" : "Sort by name";
		    fillList(sort.asporder=="alpha");
		}
	
		fillList(true);

		enableButton(false, next);
		enableButton(false, prev);

		return div;
	},
	Utils: {},
}

// test = {name, desc, exp}
Tester.Case = function(test)
{
	if(Array.isArray(test.exp) == false)
		throw new Error("Tester.Case expects an array of strings for expected results");
	this.exp = test.exp;
	this.gen = [];
	this.name = test.name;
	this.desc = test.desc;
	this.id = "test-"+Tester.counter++
	if(test.aspects)
	{
		let asparr = test.aspects.split(",").map(function(item){return item.trim()})
		for(let k = 0; k<asparr.length; k++)
			Tester.addAspects(asparr[k], this.id)
		this.aspects = asparr.sort().join(", ");
	}
}

Tester.Case.prototype.AddGenerated = function(gen)
{
	this.gen.push(gen);
}

// out: boolean
Tester.Case.prototype.Compare = function()
{
	let div = Tester.Utils.CreateDiv({add: true});
	div.id = this.id;

	if(this.gen.length == 0 && this.exp.length == 0)
	{
		div.textContent = "The test '" + this.name + "' was empty and therefore PASSED";
		this.gen = [];
		this.exp = [];
		this.name = "";
		return {status: true, div: div};
	}
	
	div.textContent += "Running the test '" + this.name + "'..." + "\n";
	if(this.aspects)
		div.textContent += "Aspects tested: {" + this.aspects + "}\n";
	div.textContent += "Brief info: " + (this.desc ? this.desc : "NA") + "\n";
	
	let pass = true;
	let length = this.exp.length < this.gen.length ? this.exp.length : this.gen.length;
	let partialMatchCount = 0;
	
	for(let k = 0; k<length; k++)
	{
		let b = this.exp[k] == this.gen[k];
		if(b)
			partialMatchCount++;
		else
		{
			if(partialMatchCount > 0)
			{
				div.textContent += "\n(" + partialMatchCount + ") entries matched interim" + "\n";
				partialMatchCount = 0;
			}
			div.textContent += "\n";
			div.textContent += "**  expected : " + this.exp[k] + "\n";
			div.textContent += "**  generated: " + this.gen[k] + "\n";
			div.textContent += "\n";
		}
		pass &= b;
	}
	
	if(partialMatchCount > 0 && partialMatchCount != length)
		div.textContent += "(" + partialMatchCount + ") entries matched interim" + "\n\n";
	
	if(this.exp.length > this.gen.length)
	{
		pass = false;
		div.textContent += "** more expected (" + this.exp.length + ") than generated (" + this.gen.length + ")" + "\n";
		for(let k = length; k<this.exp.length; k++)
			div.textContent += "   " + this.exp[k] + "\n";
	}
	else if(this.exp.length < this.gen.length)
	{
		pass = false;
		div.textContent += "** more generated (" + this.gen.length + ") than expected (" + this.exp.length + ")" + "\n";
		for(let k = length; k<this.gen.length; k++)
			div.textContent += "   " + this.gen[k] + "\n";
	}
	
	if(pass)
	{
		div.textContent += "All entries ("+this.exp.length+") matched" + "\n";
		div.textContent += "PASSED" + "\n";
	}
	else
		div.textContent += "The test '" + this.name + "' FAILED" + "\n";
	
	this.gen = [];
	this.exp = [];
	this.name = "";
	return {status: pass, div: div};
}

// info = {add, style, text}
Tester.Utils.CreateDiv = function(info)
{
	let style = info && info.style;
	let div = document.createElement("div");
	div.style.whiteSpace = "pre-wrap";
	//div.style.lineHeight = "1";
	div.style.margin = "1em";
	div.style.fontFamily = style && style.fontFamily ? style.fontFamily : "courier";
	div.style.fontSize = style && style.fontSize ? style.fontSize : "16px";
	div.style.fontStyle = style && style.fontStyle ? style.fontStyle : "normal";
	if(info && info.text)
		div.textContent = info.text;
	if(info && info.add)
		document.body.appendChild(div);
	return div;
}

Tester.Utils.CreateResultDiv = function(info)
{
	let div = Tester.Utils.CreateDiv(info);
	div.id = "result";
	document.location.href = "#"+div.id
	return div;
}

// failedTests = [{name, id}]
Tester.Utils.CreateFailList = function(failedTests, addNavig)
{
	let list = document.createElement("ol");	
	list.id = "failure-listing";		
	for(let k = 0; k<failedTests.length; k++)
	{
		let li = document.createElement("li");			
		let f = failedTests[k];
		li.innerHTML = "<a href = #" + f.id + ">" + f.name + "</a>";
		list.appendChild(li);

		if(addNavig)
		{
			let div = document.getElementById(f.id);
			if(div !== undefined)
			{
				let navig = document.createElement("div");
				navig.style.marginTop = "1em";
				navig.style.fontSize = "14px";
				navig.style.padding = "10 0";
				navig.style.border = "1px solid gray";
				navig.style.borderRight = "none"
				navig.style.borderLeft = "none"
			
				let curr = document.createElement("span");
				curr.textContent = (k+1)+"/"+failedTests.length;
				curr.style.color = "black";
				navig.appendChild(curr);			

				let prev = document.createElement("a");
				prev.textContent = "prev";
				Tester.setNavigButtonStyle(prev);
				if(k > 0)
					prev.href = "#"+failedTests[k-1].id;
				else
					prev.style.backgroundColor = "lightgray";
				navig.appendChild(prev);
				
				let next = document.createElement("a");
				next.textContent = "next";
				Tester.setNavigButtonStyle(next);
				if(k < failedTests.length - 1)
					next.href = "#"+failedTests[k+1].id;
				else
					next.style.backgroundColor = "lightgray";
				navig.appendChild(next);

				let listing = document.createElement("a");
				listing.textContent = "listing";
				Tester.setNavigButtonStyle(listing);
				listing.href = "#"+list.id;
				navig.appendChild(listing);

				div.appendChild(navig);
			}
		}
	}
	document.body.appendChild(list);
	document.location.href = "#"+list.id
}

Tester.Utils.CreateTimeStamp = function()
{
	let d = new Date;
	let t = d.toDateString() + " " + d.toTimeString();
	return Tester.Utils.CreateDiv({add: true, text: t, style: {
		fontSize: "12px",
	}});
}

// relevant for fixed sized fonts only
Tester.Utils.PadTextRows = function(rows, symCount, sym)
{
	symCount = symCount || 3;
	sym = sym || ".";
	
	let max = 0;
	for(let k = 0; k<rows.length; k++)
	{
		if(max < rows[k].length)
			max = rows[k].length
	}
	let ret = [];
	for(let k = 0; k<rows.length; k++)
	{
		let diff = max - rows[k].length;
		ret.push(rows[k] + sym.repeat(diff+symCount));
	}
	return ret;
}

// info = {map{text, value}, arr[{text, value}], symCount, sym}
Tester.Utils.GetFormattedText = function(info)
{
	let ret = "";
	if(info.map)
	{
		let keys = Object.keys(info.map);
		let padded = Tester.Utils.PadTextRows(keys, info.symCount, info.sym);
		for(let k = 0; k<keys.length; k++)
			ret += padded[k] + info.map[keys[k]] + "\n";
	}
	else if(info.arr)
	{
		let keys = [];
		for(let k = 0; k<info.arr.length; k++)
			keys.push(info.arr[k].text)
		let padded = Tester.Utils.PadTextRows(keys, info.symCount, info.sym);
		for(let k = 0; k<info.arr.length; k++)
			ret += padded[k] + info.arr[k].value + "\n";	
	}
	return ret;
}

Tester.Utils.CreateTable = function(rowNames, columnNames, rowData, cornerText)
{
	let table = document.createElement("table");
	table.style.borderCollapse = "collapse";

	let tbody = document.createElement("tbody");
	
	let cornerCell = document.createElement("td");
	if(cornerText)
		cornerCell.appendChild(document.createTextNode(cornerText));
	cornerCell.style.border = "1px solid lightgray"
	Tester.setupTableCell(cornerCell, "corner");

	let header = document.createElement("tr");
	header.appendChild(cornerCell);
	for(let k = 0; k<columnNames.length; k++)
	{
		let headerLabel = document.createElement("td");
		headerLabel.appendChild(document.createTextNode(columnNames[k]));
		Tester.setupTableCell(headerLabel, "column");
		header.appendChild(headerLabel);
	}
	tbody.appendChild(header);
	
	let rows = [];
	for(let k = 0; k<rowNames.length; k++)
	{
		let row = document.createElement("tr");
		let rowLabel = document.createElement("td");
		rowLabel.appendChild(document.createTextNode(rowNames[k]));
		Tester.setupTableCell(rowLabel, "row");
		row.appendChild(rowLabel);
		rows.push(row);
		tbody.appendChild(row);
	}

	for(let k = 0; k<rowData.length; k++)
	{
		let row = rows[k];
		let rdata = rowData[k];
		for(let q = 0; q<rdata.length; q++)
		{
			let cell = document.createElement("td");
			cell.appendChild(document.createTextNode(rdata[q]));
			Tester.setupTableCell(cell, "data");
			row.appendChild(cell);
		}
	}

	table.appendChild(tbody);
	return table;
}

Tester.setupTableCell = function(cell, type)
{
	cell.style.border = "1px solid gray"
	cell.style.padding = "2px 5px";
	if(type != "data")
	{
		cell.style.border = "1px solid gray"
		cell.style.backgroundColor = "lightgray";
		if(type == "corner")
		{
			cell.style.backgroundColor = "#9ac0da"
		}
	}
}

Tester.setNavigButtonStyle = function (button, clr){
	let style = {
		margin: "0 5px",
		textDecoration: "none",
		color: "white",
		backgroundColor: clr || "lightcoral",
		padding: "2px",
		borderRadius: "5px",	
		cursor: "pointer"			,
	};
	let skeys = Object.keys(style);
	for(let k = 0; k<skeys.length; k++)
		button.style[skeys[k]] = style[skeys[k]]
}

Tester.addAspects = function(aspect, testId){
	if(aspect == "constructor")
		aspect += " "
	let idarr = this.aspmap[aspect];
	idarr = idarr || [];
	idarr.push(testId);
	this.aspmap[aspect] = idarr;
}
