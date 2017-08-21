'use strict';
/**
* Vector 2d constructor
*/

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error('Можно прибавлять к вектору только вектор типа Vector');
    }
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(multiplier = 1) {
    return new Vector(this.x * multiplier, this.y * multiplier);
  }
}


/**
 * Actor - dynamic objects controller
 */

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if ([pos, size, speed].some((vector) => !(vector instanceof Vector))) {
      throw new Error('Можно передавать только объекты типа Vector');
    }

    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

  get type() {
    return 'actor';
  }

  get left() {
    return this.pos.x;
  }

  get top() {
    return this.pos.y;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  act() {}

  isIntersect(actor) {

    if (!(actor instanceof Actor)) {
      throw new Error('Можно передавать только объекты типа Actor');
    }

    if (actor === this) {
      return false;
    }

    return this.right > actor.left && this.left < actor.right && this.bottom > actor.top && this.top < actor.bottom;

  }
}


/**
 * Level
 */

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid.slice();
    this.actors = actors.slice();
    this.player = actors.find(elem => elem.type === 'player');
    this.height = this.grid.length;
    this.width = Math.max(0, ...this.grid.map(cell => cell.length));
    this.status = null;
    this.finishDelay = 1;

  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0
  }

  actorAt(actor) {


    if (!(actor instanceof Actor) || actor === undefined) {
      throw new Error('Можно передавать только объекты типа Actor и аргумент не может быть пустым');
    }

    return this.actors.find((curActor) => actor.isIntersect(curActor));

  }

  obstacleAt(objectPosition , objectSize) {

    if (!(objectPosition instanceof Vector) || !(objectSize instanceof Vector)) {
      throw new Error('Можно передавать только объекты типа Vector');
    }

    const topBorder = objectPosition.y;
    const rightBorder = objectPosition.x + objectSize.x;
    const bottomBorder = objectPosition.y + objectSize.y;
    const leftBorder = objectPosition.x;

    if (leftBorder < 0 || topBorder < 0 || rightBorder > this.width) {
      return 'wall'
    }

    if (bottomBorder > this.height) {
      return 'lava';
    }

    for (let y = Math.floor(topBorder); y < Math.ceil(bottomBorder); y++) {
      for (let x = Math.floor(leftBorder); x < Math.ceil(rightBorder); x++) {
        const fieldType = this.grid[y][x];
        if (fieldType) {
          return fieldType;
        }
      }
    }

  }

  removeActor(actor) {
    const result = this.actors.findIndex(curActor => actor === curActor);
    if (result !== -1) {
      this.actors.splice(result, 1);
    }
  }

  noMoreActors(actorType) {
    return !this.actors.some(actor => actor.type === actorType);
  }


  playerTouched(objectType, touchedActor) {

    if (typeof objectType !== 'string') {
      throw new Error(`В первом обязательном параметре метода playerTouched, должна быть строка`);
    }

    if (this.status !== null) {
      return false;
    }


    if (objectType === 'lava' || objectType === 'fireball') {
      this.status = 'lost';
    }

    if (objectType === 'coin' && touchedActor.type === 'coin') {
      this.removeActor(touchedActor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }

  }
}

/**
 * LevelParser
 */

class LevelParser {
  constructor(actorsSymbolDictionary = {}) {
    this.dictionary = Object.assign({}, actorsSymbolDictionary);
  }

  actorFromSymbol(actorSymbol) {
    return this.dictionary[actorSymbol];
  }

  obstacleFromSymbol(obstacleSymbol) {
    switch (obstacleSymbol) {
      case 'x':
        return 'wall';

      case '!':
        return 'lava';

    }
  }

  createGrid(plan) {
    return plan.map(row => row.split('').map(cell => this.obstacleFromSymbol(cell)));
  }

  createActors(plan) {
    const actors = [];
    plan.forEach((row, rowIndex) => {

      row.split('').forEach((cell, cellIndex) => {
        const actorClass = this.actorFromSymbol(cell);
        if (typeof actorClass === 'function') {
          const actor = new actorClass(new Vector(cellIndex, rowIndex));

          if (actor instanceof Actor) {
            actors.push(actor);
          }

        }
      });
    });

    return actors;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }

}

/**
 * Fireball
 */

class Fireball extends Actor{
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    const newPos = this.getNextPosition(time);
    if (level.obstacleAt(newPos, this.size)) {
        this.handleObstacle();
    } else {
        this.pos = newPos;
    }
  }

}

/**
 * HorizontalFireball
 */

class HorizontalFireball extends Fireball {
    constructor(pos = new Vector(0, 0), speed = new Vector(2, 0)) {
        super(pos, speed);
    }
}

/**
 * VerticalFireball
 */

class VerticalFireball extends Fireball {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 2)) {
        super(pos, speed);
    }
}

/**
 * FireRain
 */

class FireRain extends Fireball {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 3)) {
        super(pos, speed);
        this.startPosition = pos;
    }

    handleObstacle() {
        this.pos = this.startPosition;
    }
}

/**
 * Coin
 */

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6), new Vector(0, 0));
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = rand(Math.PI * 2, 0);
        this.startPos = this.pos;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring = this.spring + this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, this.springDist * Math.sin(this.spring));
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.startPos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

/**
 * Player
 */

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }

  get type() {
    return 'player';
  }
}

/**
 * Game
 */

const actors = {
      '@': Player,
      'v': FireRain,
      'o': Coin,
      '=': HorizontalFireball,
      '|': VerticalFireball
    };
const parser = new LevelParser(actors);

loadLevels()
  .then(
  response => {
    runGame(JSON.parse(response), parser, DOMDisplay).then(() => alert('Вы выиграли!'));
  },
  error => alert(`Rejected: ${error}`)
);
