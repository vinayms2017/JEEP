# JEEP

JEEP is a C++ inspired framework that brings object orientation to JavaScript, well beyond what is available in the language by design. It is an attempt to elevate the language from being a simple DOM manipulating script to something that can be used for classic software engineering. By that I mean being used to create reusable, customizable and extensible components of complex structure and behavior.

## Features

Jeep has a host of features and they all revolve around structure and semantics. As a result, it promotes writing readable code and is very strict in enforcing a set of rules. It delivers all this with minimum overhead, and sometimes with none at all. Thus, it can be classed as a medium sized framework with moderate amount of complexity. Yet, it is a very flexible framework and quite simple to use. Such a framework cannot be effectively described in a small text file. Hence a 100+ page pdf document exists that discusses the framework in detail.

For simplicity, the features are reduced to these two lists

### Qualitative
* robustness
* maintainable and extensible classes
* intuitive class description
* improved productivity and performance

### Technical
* single and multiple inheritance
* constructor and destructor
* virtual and abstract (pure virtual) functions
* development mode and production mode split

## Quick Example

The image is a screen shot of a simple demonstration application created using Jeep that helps visualize hierarchies. It shows a Mermaid class. The code follows after it. 

![](https://github.com/vinayms2017/JEEP/blob/master/mermaiddemo.jpg)

``` javascript

let DemoEnv = JEEP.CreateEnvironment({
    client: "jeep-aware", 
    mode: "development-mode"
});

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

DemoEnv.Object.RegisterClass("Mermaid", {
    BaseClass: "Human, Fish",
    Functions: {
        $virtual$__Move: function(x, y){this.$base.Fish.Move(x,y)},
        $virtual$__Breathe: function(){this.$base.Human.Breathe()},
    }
});

let Mermaid = JEEP.GetClass("Mermaid");
let m = new Mermaid;
m.LiveOneMoment();

```

## Authors

Designed and developed by Vinay.M.S. My contact is present in the document.

## Installation

Simply include the jeep.js file as you would any other script.

## Dependency

None. Jeep is written in standard JavaScript (ES5) and contained in a single file.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details
