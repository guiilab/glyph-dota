# Glyph - Dota 2 Data

Glyph application, visualizing data from Dota 2.

- [Glyph - Dota](https://guiilab.github.io/glyph-dota) – Live Version

### Overview
This is an application for visualizing sequence data. It is composed of two visual representations a state graph (left) and a sequence graph (right). The state graph shows action paths as a node-link diagram, and the sequence graph encodes action sequences as nodes. 

The State Graph is the node-link diagram of the game states and actions of the players. Nodes in the state graph display different game states and the directed links are the actions to get from one state to another. The size of the states and the thickness of the links varies with the number of players visiting the states and the links, respectively.

The Sequence Graph visually shows nodes that represent the sequence patterns exhibited by players. Each node represents a full sequence and the distance between the nodes depends on the similarity of the sequence patterns between them.

### Get Started

```sh
git clone
cd glyph-dota
run live server with IDE or package of choice
```
### File Structure
Glyph is an application built with vanilla JavaScript, HTML5, and CSS3. All of the JavaScript can be found in [app.js](app.js). The libraries are queried locally in [libs](/libs), as well as the data in [data](/data). 

### Data

Two data files are required for visualization: JSON files with the properly formatted data for visualization (see [Data](/data) for examples) and a visualization_ids.json file, which contains an array of strings that correspond to the names of the files to be visualized. This files must be updated with each additional or removal of JSON visualization files.

### License
This software is patented and owned by [Truong-Huy D. Nguyen](https://github.com/truonghuy), [Magy Seif El-Nasr](https://camd.northeastern.edu/faculty/magy-seif-el-nasr/), [Andy Bryant](https://github.com/andymbryant), and [Northeastern University](https://www.khoury.northeastern.edu/).

All rights reserved. Any use is forbidden without express written permission from the owners.