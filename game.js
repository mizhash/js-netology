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
    // По-моему проверка длины arguments - лишняя
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

    // по-моему это лучше не выности в функцию,
    // потому что используется только в одном месте
    // и при чтении кода нужно бегать туда сюда, чтобы понять что происходит
    const checkIntersection = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

    if (!(actor instanceof Actor) || actor === undefined) {
      throw new Error('Можно передавать только объекты типа Actor');
    }

    if (actor === this) {
      return false;
    // else тут не нужен - если выполнение зайдёт в if то функция прекратит выполнение
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
    // Тут нужно создать копии массивов, чтобы нельзя было изменить поля объекта из вне
    this.grid = grid;
    this.actors = actors;
    this.player = actors.find(elem => elem.type === 'player');

    // просто объявите через this.height - тогда высота не будет каждый раз пересчитываться при запросе поля height
    // поля с get и set объявляются у классов как
    // get height() { ... } и set height(value) { ... }
    Object.defineProperty(this, 'height', {
      get() {
        // мне кажется проверка на массивы избыточна
        return (this.grid.every(level => Array.isArray(level))) ? this.grid.length : 1;
      }
    });

    // аналогично
    Object.defineProperty(this, 'width', {
      get() {
        // здесь можно намного проще записать с помощью Math.max и .map
        const startPoint = this.height > 1 ? this.grid[0].length : this.grid.length;
        return this.grid.reduce((memo, levelCell) => levelCell.length > memo ? levelCell.length : memo, startPoint);
      }
    });

    this.status = null;
    this.finishDelay = 1;

  }

  isFinished() {
    // здесь лучше написать просто return <условие>;
    if (this.status !== null && this.finishDelay < 0) {
      return true;
    }

    return false;
  }

  actorAt(actor) {


    if (!(actor instanceof Actor) || actor === undefined) {
      throw new Error('Можно передавать только объекты типа Actor и аргумент не может быть пустым');
    }

    // эта проверка избыточна, позаботится о том, что поля заполнены лучше в конструкторе
    if (this.grid === undefined && this.grid === undefined) {
    	return undefined;
    }

    // тут лушче использовать метод find
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

    // если хочется использовать такую проверку её нужно вынести выше, до обращения к полям объектов
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
    // эту проверку можно убрать, если модифицировать код ниже
    if (this.actors.length === 0) {
      return true;
    }

    // не используйте тренарный оператор сравнения когда в конце true или false
    // return expr; или return !expr;
    return this.actors.some(actor => actor.type === actorType) ? false : true;
  }


  playerTouched(objectType, touchedActor) {

    if (typeof objectType !== 'string') {
      throw new Error(`В первом обязательном параметре метода playerTouched, должна быть строка`);
    }

    if (this.status !== null) {
      return false;
    }

    // здесь проще сравнить objectType с двумы значениями в if
    if (['lava', 'fireball'].find(item => item === objectType)) {
      this.status = 'lost';

    }

    // вообще можно конечно обойтись без второй проверки, но пусть будет
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
  // некорректное заничение по-умолчанию
  constructor(actorsSymbolDictionary = []) {
    // здесь нужно создать копию объекта
    this.dictionary = actorsSymbolDictionary;
  }

  actorFromSymbol(actorSymbol) {
    if (actorSymbol === undefined) {
      return undefined;
    }

    // здесь нужно просто обратится к полю объекта
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
    // зачем Array.prototype.map?
    return plan.map((row) => Array.prototype.map.call(row, (cell) => this.obstacleFromSymbol(cell)));
  }

  createActors(plan) {
    const actors = [];
    plan.forEach((row, rowIndex) => {
      // зачем Array.prototype.map?
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
    // здесь нужно использовать plus и times
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
    // лучше добавить значение по-умолчанию
    constructor(coords) {
        super(coords);
        // параметры (в том числе speed) нужно задавать через базовый конструктор
        this.speed.x = 2;
    }
}

/**
 * VerticalFireball
 */

class VerticalFireball extends Fireball {
    // лучше добавить значение по-умолчанию
    constructor(coords) {
        super(coords);
        // параметры (в том числе speed) нужно задавать через базовый конструктор
        this.speed.y = 2;
    }
}

/**
 * FireRain
 */

class FireRain extends Fireball {
    // лучше добавить значение по-умолчанию
    constructor(coords) {
        super(coords);
        // параметры (в том числе speed) нужно задавать через базовый конструктор
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
    // вместо coords лучше везде использовать pos для единоообразия
    // лучше добавить значение по-умолчанию
    constructor(coords) {
        super(coords);
        // параметры (pos, speed) нужно задавать через базовый конструктор
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
  // лучше добавить значение по-умолчанию
  constructor(coords) {
    super(coords);
    // через конструктор базового класса
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

// тут, в принципе, можно и без обёртки обойтись
const Game = (function(){
  // вроде бы лишняя переменная
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

