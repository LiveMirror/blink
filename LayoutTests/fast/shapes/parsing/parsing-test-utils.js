// Valid values for both shape-inside and shape-outside. Two values are specified when the shape property value
// differs from the specified value. Three values are specified when the computed shape property value differs
// from the specified value.
// eg: "specified value/CSS Text value/computed style value"
// or: ["specified value", "CSS Text value/computed style value"]
// or: ["specified value", "CSS Text value", "Computed style value"]
var validShapeValues = [
    "none",
    ["rectangle(10px, 20px, 30px, 40px)", "rectangle(10px, 20px, 30px, 40px)", "rectangle(10px, 20px, 30px, 40px, 0px, 0px)"],
    ["rectangle(10px, 20px, 30px, 40px, 5px)", "rectangle(10px, 20px, 30px, 40px, 5px)", "rectangle(10px, 20px, 30px, 40px, 5px, 5px)"],
    "rectangle(10px, 20px, 30px, 40px, 5px, 10px)",

    ["inset-rectangle(10px, 20px, 30px, 40px)", "inset-rectangle(10px, 20px, 30px, 40px)", "inset-rectangle(10px, 20px, 30px, 40px, 0px, 0px)"],
    ["inset-rectangle(10px, 20px, 30px, 40px, 5px)", "inset-rectangle(10px, 20px, 30px, 40px, 5px)", "inset-rectangle(10px, 20px, 30px, 40px, 5px, 5px)"],
    "inset-rectangle(10px, 20px, 30px, 40px, 5px, 10px)",

    ["inset(10px)", "inset(10px 10px 10px 10px)", "inset(10px 10px 10px 10px round 0px 0px 0px 0px / 0px 0px 0px 0px)"],
    ["inset(10px 9px)", "inset(10px 9px 10px 9px)", "inset(10px 9px 10px 9px round 0px 0px 0px 0px / 0px 0px 0px 0px)"],
    ["inset(10px 9px 8px)", "inset(10px 9px 8px 9px)", "inset(10px 9px 8px 9px round 0px 0px 0px 0px / 0px 0px 0px 0px)"],
    ["inset(10px 20px 30px 40px)", "inset(10px 20px 30px 40px)", "inset(10px 20px 30px 40px round 0px 0px 0px 0px / 0px 0px 0px 0px)"],
    ["inset(10px round 9px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 9px 9px 9px 9px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 9px 9px 9px 9px)"],
    ["inset(10px round 9px / 9px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 9px 9px 9px 9px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 9px 9px 9px 9px)"],
    ["inset(10px round 9px / 8px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 8px 8px 8px 8px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 8px 8px 8px 8px)"],
    ["inset(10px round 9px / 8px 7px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 8px 7px 8px 7px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 8px 7px 8px 7px)"],
    ["inset(10px round 9px / 8px 7px 6px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 8px 7px 6px 7px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 8px 7px 6px 7px)"],
    ["inset(10px round 9px / 8px 7px 6px 5px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 8px 7px 6px 5px)", "inset(10px 10px 10px 10px round 9px 9px 9px 9px / 8px 7px 6px 5px)"],
    ["inset(10px round 9px 8px / 7px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 7px 7px 7px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 7px 7px 7px)"],
    ["inset(10px round 9px 8px / 7px 6px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 6px 7px 6px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 6px 7px 6px)"],
    ["inset(10px round 9px 8px / 7px 6px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 6px 7px 6px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 6px 7px 6px)"],
    ["inset(10px round 9px 8px / 7px 6px 5px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 6px 5px 6px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 6px 5px 6px)"],
    ["inset(10px round 9px 8px / 7px 6px 5px 4px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 6px 5px 4px)", "inset(10px 10px 10px 10px round 9px 8px 9px 8px / 7px 6px 5px 4px)"],
    ["inset(10px round 9px 8px 7px / 6px)", "inset(10px 10px 10px 10px round 9px 8px 7px 8px / 6px 6px 6px 6px)", "inset(10px 10px 10px 10px round 9px 8px 7px 8px / 6px 6px 6px 6px)"],
    ["inset(10px round 9px 8px 7px / 6px 5px)", "inset(10px 10px 10px 10px round 9px 8px 7px 8px / 6px 5px 6px 5px)", "inset(10px 10px 10px 10px round 9px 8px 7px 8px / 6px 5px 6px 5px)"],
    ["inset(10px round 9px 8px 7px / 6px 5px 4px)", "inset(10px 10px 10px 10px round 9px 8px 7px 8px / 6px 5px 4px 5px)", "inset(10px 10px 10px 10px round 9px 8px 7px 8px / 6px 5px 4px 5px)"],
    ["inset(10px round 9px 8px 7px / 6px 5px 4px 3px)", "inset(10px 10px 10px 10px round 9px 8px 7px 8px / 6px 5px 4px 3px)", "inset(10px 10px 10px 10px round 9px 8px 7px 8px / 6px 5px 4px 3px)"],
    ["inset(10px round 9px 8px 7px 6px / 5px)", "inset(10px 10px 10px 10px round 9px 8px 7px 6px / 5px 5px 5px 5px)", "inset(10px 10px 10px 10px round 9px 8px 7px 6px / 5px 5px 5px 5px)"],
    ["inset(10px round 9px 8px 7px 6px / 5px 4px)", "inset(10px 10px 10px 10px round 9px 8px 7px 6px / 5px 4px 5px 4px)", "inset(10px 10px 10px 10px round 9px 8px 7px 6px / 5px 4px 5px 4px)"],
    ["inset(10px round 9px 8px 7px 6px / 5px 4px 3px)", "inset(10px 10px 10px 10px round 9px 8px 7px 6px / 5px 4px 3px 4px)", "inset(10px 10px 10px 10px round 9px 8px 7px 6px / 5px 4px 3px 4px)"],
    ["inset(10px round 9px 8px 7px 6px / 5px 4px 3px 2px)", "inset(10px 10px 10px 10px round 9px 8px 7px 6px / 5px 4px 3px 2px)", "inset(10px 10px 10px 10px round 9px 8px 7px 6px / 5px 4px 3px 2px)"],
    ["inset(10px 20px 30px 40px round 5px 6px)", "inset(10px 20px 30px 40px round 5px 6px 5px 6px / 5px 6px 5px 6px)", "inset(10px 20px 30px 40px round 5px 6px 5px 6px / 5px 6px 5px 6px)"],
    "inset(10px 20px 30px 40px round 5px 6px 7px 8px / 50px 60px 70px 80px)",

    "circle(10px, 20px, 30px)", // FIXME: Remove this test once we do not support the deprecated CSS Shapes syntax anymore.

    ["circle()", "circle()", "circle(closest-side at 50% 50%)"],
    ["circle(farthest-side)", "circle(farthest-side)", "circle(farthest-side at 50% 50%)"],
    ["circle(closest-side)", "circle(closest-side)", "circle(closest-side at 50% 50%)"],
    ["circle(10px)", "circle(10px)", "circle(10px at 50% 50%)"],
    ["circle(10px at 10px)", "circle(10px at 10px 50%)"],
    "circle(10px at 10px 10px)",
    ["circle(at 10px)", "circle(at 10px 50%)", "circle(closest-side at 10px 50%)"],
    ["circle(at 10px 10px)", "circle(at 10px 10px)", "circle(closest-side at 10px 10px)"],
    ["circle(at top left)", "circle(at 0% 0%)", "circle(closest-side at 0% 0%)"],
    ["circle(at right bottom)", "circle(at 100% 100%)", "circle(closest-side at 100% 100%)"],
    ["circle(10px at left top 10px)", "circle(10px at left 0% top 10px)"],
    ["circle(10px at top 10px left 10px)", "circle(10px at left 10px top 10px)"],
    ["circle(10px at right 10px bottom 10px)", "circle(10px at right 10px bottom 10px)"],

    "ellipse(10px, 20px, 30px, 40px)", // FIXME: Remove this test once we do not support the deprecated CSS Shapes syntax anymore.

    ["ellipse()", "ellipse()", "ellipse(closest-side closest-side at 50% 50%)"],
    ["ellipse(10px)", "ellipse(10px)", "ellipse(10px closest-side at 50% 50%)"],
    ["ellipse(10px 20px)", "ellipse(10px 20px)", "ellipse(10px 20px at 50% 50%)"],
    ["ellipse(10px at 10px)", "ellipse(10px at 10px 50%)", "ellipse(10px closest-side at 10px 50%)"],
    ["ellipse(10px 20px at 10px)", "ellipse(10px 20px at 10px 50%)"],
    ["ellipse(10px at 10px 10px)", "ellipse(10px at 10px 10px)", "ellipse(10px closest-side at 10px 10px)"],
    ["ellipse(at 10px)", "ellipse(at 10px 50%)", "ellipse(closest-side closest-side at 10px 50%)"],
    ["ellipse(at 10px 10px)", "ellipse(at 10px 10px)", "ellipse(closest-side closest-side at 10px 10px)"],
    ["ellipse(at top left)", "ellipse(at 0% 0%)", "ellipse(closest-side closest-side at 0% 0%)"],
    ["ellipse(at right bottom)", "ellipse(at 100% 100%)", "ellipse(closest-side closest-side at 100% 100%)"],
    ["ellipse(10px at left top 10px)", "ellipse(10px at left 0% top 10px)", "ellipse(10px closest-side at left 0% top 10px)"],
    ["ellipse(10px at top 10px left 10px)", "ellipse(10px at left 10px top 10px)", "ellipse(10px closest-side at left 10px top 10px)"],
    ["ellipse(10px at right 10px bottom 10px)", "ellipse(10px at right 10px bottom 10px)", "ellipse(10px closest-side at right 10px bottom 10px)"],
    ["ellipse(10px 20px at left top 10px)", "ellipse(10px 20px at left 0% top 10px)"],
    ["ellipse(10px 20px at top 10px left 10px)", "ellipse(10px 20px at left 10px top 10px)"],
    ["ellipse(10px 20px at right 10px bottom 10px)", "ellipse(10px 20px at right 10px bottom 10px)"],

    ["polygon(10px 20px, 30px 40px, 40px 50px)", "polygon(nonzero, 10px 20px, 30px 40px, 40px 50px)"],
    ["polygon(evenodd, 10px 20px, 30px 40px, 40px 50px)", "polygon(evenodd, 10px 20px, 30px 40px, 40px 50px)"],
    ["polygon(nonzero, 10px 20px, 30px 40px, 40px 50px)", "polygon(nonzero, 10px 20px, 30px 40px, 40px 50px)"],

    "content-box",
    "padding-box",
    "border-box",
    "margin-box",

    "polygon(nonzero, 10px 10px, 20px 20px, 30px 30px) content-box",
    "polygon(nonzero, 10px 10px, 20px 20px, 30px 30px) padding-box",
    "polygon(nonzero, 10px 10px, 20px 20px, 30px 30px) border-box",
    "polygon(nonzero, 10px 10px, 20px 20px, 30px 30px) margin-box",

    ["content-box polygon(nonzero, 10px 10px, 20px 20px, 30px 30px)", "polygon(nonzero, 10px 10px, 20px 20px, 30px 30px) content-box"],
    ["padding-box polygon(nonzero, 10px 10px, 20px 20px, 30px 30px)", "polygon(nonzero, 10px 10px, 20px 20px, 30px 30px) padding-box"],
    ["border-box polygon(nonzero, 10px 10px, 20px 20px, 30px 30px)", "polygon(nonzero, 10px 10px, 20px 20px, 30px 30px) border-box"],
    ["margin-box polygon(nonzero, 10px 10px, 20px 20px, 30px 30px)", "polygon(nonzero, 10px 10px, 20px 20px, 30px 30px) margin-box"]
];

// Invalid values for both shape-inside and shape-outside. When an invalid shape value is specified, the
// shape property's computed value is the same as its default.
var invalidShapeValues = [
    "calc()",
    "auto",

    "rectangle()",
    "rectangle(10px)",
    "rectangle(10px, 10px)",
    "rectangle(10px, 20px, 30px)",
    "rectangle(10px 20px 30px 40px)",
    "rectangle(10px, 20px, 30px, 40px, 50px, 60px, 70px)",

    "inset-rectangle()",
    "inset-rectangle(10px)",
    "inset-rectangle(10px, 10px)",
    "inset-rectangle(10px, 20px, 30px)",
    "inset-rectangle(10px 20px 30px 40px)",
    "inset-rectangle(10px, 20px, 30px, 40px, 50px, 60px, 70px)",

    "inset()",
    "inset(10px, 10px)",
    "inset(10px 20px, 30px)",
    "inset(10px, 20px 30px 40px)",
    "inset(10px 20px 30px 40px 50px 60px)",
    "inset(round)",
    "inset(round 10px)",
    "inset(10px round)",
    "inset(10px round 10px /)",
    "inset(10px round 20px 30px 40px 50px 60px)",
    "inset(10px round /)",
    "inset(10px round / 10px)",
    "inset(/)",
    "inset(/ 10px)",
    "inset(round /)",

    "circle(10px, 20px)", // FIXME: Remove this test once we do not support the deprecated CSS Shapes syntax anymore.
    "circle(10px 20px 30px)", // FIXME: Remove this test once we do not support the deprecated CSS Shapes syntax anymore.
    "circle(10px, 20px, 30px, 40px)", // FIXME: Remove this test once we do not support the deprecated CSS Shapes syntax anymore.

    "circle(10px 20px)",
    "circle(10px at 10px 10px 10px)",
    "circle(10px at 10px 10px at center)",
    "circle(10px at center center 10px)",
    "circle(at 10px 10px 10px)",
    "circle(at 10px 10px at center)",
    "circle(at center center 10px)",

    "ellipse(10px, 20px)", // FIXME: Remove this test once we do not support the deprecated CSS Shapes syntax anymore.
    "ellipse(10px, 20px, 30px)", // FIXME: Remove this test once we do not support the deprecated CSS Shapes syntax anymore.
    "ellipse(10px 20px 30px 40px)", // FIXME: Remove this test once we do not support the deprecated CSS Shapes syntax anymore.

    "ellipse(10px 20px 30px)",
    "ellipse(10px at 10px 10px 10px)",
    "ellipse(10px at 10px 10px at center)",
    "ellipse(10px at center center 10px)",
    "ellipse(10px 20px 30px at center center 10px)",
    "ellipse(at 10px 10px 10px)",
    "ellipse(at 10px 10px at center)",
    "ellipse(at center center 10px)",

    "polygon()",
    "polygon(evenodd 10px 20px, 30px 40px, 40px 50px)",
    "polygon(nonzero 10px 20px, 30px 40px, 40px 50px)",
    "polygon(nonzero)",
    "polygon(evenodd)",
    "polygon(10px)",
    "polygon(nonzero,10px)",
    "polygon(evenodd,12px)",
    "polygon(10px, 20px, 30px, 40px, 40px, 50px)",

    "content-box content-box",
    "polygon(nonzero, 0 0 ,10px 10px, 10px 0) polygon(nonzero, 0 0, 10px 10px, 10px 0)",
    "none content-box",
    "content-box none",
    "polygon(none) content-box",
    "content-box polygon(none)",
    "circle(50px) none",
    "none circle(50px)",
    "url('shape.svg') content-box",
    "url('shape.svg') polygon(nonzero, 0 0, 10px 10px, 10px 0)"
];

// Valid length values for shape-margin and shape-padding.
var validShapeLengths = [
    "1.5ex",
    "2em",
    "2.5in",
    "3cm",
    "3.5mm",
    "4pt",
    "4.5pc",
    "5px"
];

// Invalid length values for shape-margin and shape-padding.
var invalidShapeLengths = [
    "-5px",
    "none",
    "120%",
    "\'string\'"
];

function getCSSText(property, value)
{
    var element = document.createElement("div");
    element.style.cssText = property + ": " + value;
    return element.style[property];
}

function getComputedStyleValue(property, value)
{
    var element = document.createElement("div");
    document.body.appendChild(element);
    element.style.setProperty(property, value);
    var computedValue = getComputedStyle(element).getPropertyValue(property);
    document.body.removeChild(element);
    return computedValue;
}

function getParentAndChildComputedStyles(property, parentValue, childValue)
{
    var parentElement = document.createElement("div");
    document.body.appendChild(parentElement);
    parentElement.style.setProperty(property, parentValue);
    var childElement = document.createElement("div");
    parentElement.appendChild(childElement);
    childElement.style.setProperty(property, childValue);
    var parentComputedValue = getComputedStyle(parentElement).getPropertyValue(property);
    var childComputedValue = getComputedStyle(childElement).getPropertyValue(property);
    parentElement.removeChild(childElement);
    document.body.removeChild(parentElement);
    return {parent: parentComputedValue, child: childComputedValue};
}

function getParentAndChildComputedStylesString(property, parentValue, childValue)
{
    var styles = getParentAndChildComputedStyles(property, parentValue, childValue);
    return "parent: " + styles.parent + ", child: " + styles.child;
}

function getChildComputedStyle(property, parentValue, childValue)
{
    var styles = getParentAndChildComputedStyles(property, parentValue, childValue);
    return styles.child;
}

function testShapeSpecifiedProperty(property, value, expectedValue)
{
    shouldBeEqualToString('getCSSText("' + property + '", "' + value + '")', expectedValue);
}

function testShapeComputedProperty(property, value, expectedValue)
{
    shouldBeEqualToString('getComputedStyleValue("' + property + '", "' + value + '")', expectedValue);
}

function testNotInheritedShapeChildProperty(property, parentValue, childValue, expectedChildValue)
{
    shouldBeEqualToString('getChildComputedStyle("' + property + '", "' + parentValue + '", "' + childValue + '")', expectedChildValue);
}

// Need to remove the base URL to avoid having local paths in the expected results.
function removeBaseURL(src) {
    var urlRegexp = /url\(([^\)]*)\)/g;
    return src.replace(urlRegexp, function(match, url) {
        return "url(" + url.substr(url.lastIndexOf("/") + 1) + ")";
    });
}

function testLocalURLShapeProperty(property, value, expected)
{
    shouldBeEqualToString('removeBaseURL(getCSSText("' + property + '", "' + value + '"))', expected);
    shouldBeEqualToString('removeBaseURL(getComputedStyleValue("' + property + '", "' + value + '"))', expected);
}

function testShapePropertyParsingFailure(property, value, defaultComputedStyle)
{
    shouldBeEqualToString('getCSSText("' + property + '", "' + value + '")', '');
    shouldBeEqualToString('getComputedStyleValue("' + property + '", "' + value + '")', defaultComputedStyle);
}

function testNotInheritedShapeProperty(property, parentValue, childValue, expectedValue)
{
    shouldBeEqualToString('getParentAndChildComputedStylesString("' + property + '", "' + parentValue + '", "' + childValue + '")', expectedValue);
}

function applyToEachArglist(testFunction, arglists)
{
    arglists.forEach(function(arglist, i, a) {testFunction.apply(null, arglist);});
}
