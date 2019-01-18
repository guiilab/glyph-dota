# Glyph
### Dota 2 Data

Glyph application, visualizing data from Dota 2.

- [Glyph - Dota](https://guiilab.github.io/glyph-dota/) – Live Version

This is an application for visualizing sequential data. It is composed of two visual representations a state graph (left) and a sequence graph (right). The state graph shows action paths as a node-link diagram, and the sequence graph encodes action sequences as nodes. 

The State Grap is the node-link diagram of the game states and actions of the players. Nodes in the state graph display different game states and the directed links are the actions to get from one state to another. The size of the states and the thickness of the links varies with the number of players visiting the states and the links, respectively.

The Sequence Graph visually shows nodes that represent the sequence patterns exhibited by players. Each node represents a full sequence and the distance between the nodes depends on the similarity of the sequence patterns between them.


### Get Started

```sh
git clone
cd glyph-dota
run live server in IDE of choice
```