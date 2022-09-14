# Roam toolbar 

## search by selection

![](search.gif)

## smartblocks

1. open config
2. ![](smart%20blocks%20config.jpeg)


**for now, only works with custom smartblocks**


![](smart%20blocks.gif)


## style selection

![](https://github.com/dive2Pro/roam-toolbar/blob/main/Toolbar%20demo.gif)

## reference transforms

![](https://github.com/dive2Pro/roam-toolbar/blob/main/Toolbar%20reference%20transform.gif)


## block transforms

![](https://github.com/dive2Pro/roam-toolbar/blob/main/Toolbar%20block%20transform.gif)


# changelog

- support search blocks and pages base on selection 
- support smartblocks 
- support selection style transforms

# use by [[roam/js]]

```js
    var existing = document.getElementById("roam-toolbar");
    if (!existing) {
    var extension = document.createElement("script");
        extension.src = "https://unpkg.com/@dive2pro/roam-toolbar@0.0.2/build/main.js";
        extension.id = "roam-toolbar";
        extension.async = true;
        extension.type = "text/javascript";
        document.getElementsByTagName("head")[0].appendChild(extension);
    }
```