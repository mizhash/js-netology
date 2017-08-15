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

  times(multiplier) {
    return new Vector(this.x * multiplier, this.y * multiplier);
  }
}


/**
 * Actor - dynamic objects controller
 */

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {

    if (arguments.length > 0 && [pos, size, speed].some((vector) => !(vector instanceof Vector))) {
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

    const checkIntersection = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

    if (!(actor instanceof Actor) || actor === undefined) {
      throw new Error('Можно передавать только объекты типа Actor');
    }

    if (actor === this) {
      return false;
    } else {
      return checkIntersection(this, actor);
    }



  }
}


/**
 * Level
 */

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.player = actors.find(elem => elem.type === 'player');

    Object.defineProperty(this, 'height', {
      get() {
        return (this.grid.every(level => Array.isArray(level))) ? this.grid.length : 1;
      }
    });

    Object.defineProperty(this, 'width', {
      get() {
        const startPoint = this.height > 1 ? this.grid[0].length : this.grid.length;
        return this.grid.reduce((memo, levelCell) => levelCell.length > memo ? levelCell.length : memo, startPoint);
      }
    });

    this.status = null;
    this.finishDelay = 1;

  }

  isFinished() {
    if (this.status !== null && this.finishDelay < 0) {
      return true;
    }

    return false;
  }

  actorAt(actor) {


    if (!(actor instanceof Actor) || actor === undefined) {
      throw new Error('Можно передавать только объекты типа Actor и аргумент не может быть пустым');
    }

    if (this.grid === undefined && this.grid === undefined) {
    	return undefined;
    }

    for (const curActor of this.actors) {
    	if (actor.isIntersect(curActor)) {
    		return curActor;
    	}
    }

  }

  obstacleAt(objectPosition , objectSize) {
    
    const topBorder = Math.floor(objectPosition.y);
    const rightBorder = Math.ceil(objectPosition.x + objectSize.x);
    const bottomBorder = Math.ceil(objectPosition.y + objectSize.y);
    const leftBorder = Math.floor(objectPosition.x);
    
    if (!(objectPosition instanceof Vector) || !(objectSize instanceof Vector)) {
      throw new Error('Можно передавать только объекты типа Vector');
    }

    if (leftBorder < 0 || topBorder < 0 || rightBorder > this.width) {
      return 'wall'
    }

    if (bottomBorder > this.height) {
      return 'lava';  
    }

    for (let y = topBorder; y < bottomBorder; y++) {
            for (let x = leftBorder; x < rightBorder; x++) {
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

    if (this.actors.length === 0) {
      return true;
    }

    return this.actors.some(actor => actor.type === actorType) ? false : true;
  }


  playerTouched(objectType, touchedActor) {

    if (typeof objectType !== 'string') {
      throw new Error(`В первом обязательном параметре метода playerTouched, должна быть строка`);
    }

    if (this.status !== null) {
      return false;
    }

    if (['lava', 'fireball'].find(item => item === objectType)) {
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
  constructor(actorsSymbolDictionary = []) {
    this.dictionary = actorsSymbolDictionary;
  }

  actorFromSymbol(actorSymbol) {
    if (actorSymbol === undefined) {
      return undefined;
    }

    if (Object.keys(this.dictionary).indexOf(actorSymbol) !== -1) {
      return this.dictionary[actorSymbol];
    }

    return undefined;

  }

  obstacleFromSymbol(obstacleSymbol) {
    switch (obstacleSymbol) {
      case 'x':
        return 'wall';

      case '!':
        return 'lava';

      default:
        return undefined;
    }
  }

  createGrid(plan) {
    return plan.map((row) => Array.prototype.map.call(row, (cell) => this.obstacleFromSymbol(cell)));
  }

  createActors(plan) {
    const actors = [];
    plan.forEach((row, rowIndex) => {
      Array.prototype.forEach.call(row, (cell, cellIndex) => {
        if (typeof (this.actorFromSymbol(cell)) === 'function') {
          const actorClass = this.actorFromSymbol(cell);
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
  constructor(coords = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(coords, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    const newPos = this.getNextPosition(time);
    const isObstacle = level.obstacleAt(newPos, this.size);
    if (!isObstacle) {
        this.pos = newPos;
    }
    else {
        this.handleObstacle();
    }
  }

}

/**
 * HorizontalFireball
 */

class HorizontalFireball extends Fireball {
    constructor(coords) {
        super(coords);
        this.speed.x = 2;
    }
}

/**
 * VerticalFireball
 */

class VerticalFireball extends Fireball {
    constructor(coords) {
        super(coords);
        this.speed.y = 2;
    }
}

/**
 * FireRain
 */

class FireRain extends Fireball {
    constructor(coords) {
        super(coords);
        this.speed.y = 3;
        this.startPosition = coords;
    }

    handleObstacle() {
        this.pos = this.startPosition;
    }
}

/**
 * Coin
 */

class Coin extends Actor {
    constructor(coords) {
        super(coords);
        this.pos = this.pos.plus(new Vector(0.2, 0.1));
        this.size = new Vector(0.6, 0.6);
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
  constructor(coords) {
    super(coords);
    this.pos = this.pos.plus(new Vector(0, -0.5));
    this.size = new Vector(0.8, 1.5);
  }

  get type() {
    return 'player';
  }
}

function rand(max = 10, min = 0) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Game
 */

const Game = (function(){
  let finalPlan;
  
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
    	finalPlan = JSON.parse(response);      
      runGame(finalPlan, parser, DOMDisplay).then(() => alert('Вы выиграли!'));
    },
    error => alert(`Rejected: ${error}`)
  );
}());

