# WaterBall
water ball effect render by canvas

# Usage
create a canvas element
```
<canvas id="ball" width="200px" height="200px"></canvas>
```

init it by follow js
```
XT.simpleChart(document.getElementById('ball'), {
    type: 'waterball',
    min: 0,
    val: 350,
    max: 500,
    radius: 50,
    color: '#FF0',
    label: '75%'
});
```

# Options
| option             | description           | value        |
 -------------------- | --------------------- | ------------- 
| type                | render as ?           | waterball    |
| min                 | min value             | number       |
| val                 | current value         | number       |
| max                 | max value             | number       |
| radius              | ball's radius         | number       |
| color               | water color           | HEX          |
| label               |                       | string or { text: '50%', color: '#333'} |
