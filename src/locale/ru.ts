/**
 * Russian text pack. Every word the child ever sees or hears lives here.
 *
 * The rule for the rest of the codebase: nothing outside this folder is written
 * in Russian. Code, comments and developer-facing error messages are English;
 * anything addressed to the child is a key in this file. The one exception is
 * where Russian is the subject itself — a language example in a comment, or a
 * test asserting what this pack produces.
 *
 * `numbers` is here too, and that is not an accident: number words are what
 * the recogniser grammar is built from (T4, T16) and what the teacher reads
 * out loud (T12). Both are language, not logic.
 */
export const ru = {
  code: 'ru',

  /**
   * Softens what comes back from recognition: case, «ё», punctuation and words
   * outside the grammar. Alphabet-specific, hence part of the pack — and shared
   * by everything that reads an answer back, numbers and words alike.
   */
  normalise: (text: string): string =>
    text
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^а-я]+/g, ' ')
      .trim(),

  app: {
    loadingTitle: 'Минутку…',
    loadingNote: 'Готовлю арену',
    errorTitle: 'Что-то сломалось',
    /** Dev-only screen switch, gone after packaging (phase 7). */
    switchToSpike: 'полигон',
    switchToGame: 'игра',
  },

  name: {
    question: 'Как тебя зовут?',
    start: 'Вперёд',
  },

  select: {
    title: (name: string) => `С кем сразимся, ${name}?`,
    wins: (count: number) => `Побед: ${count}`,
    newGame: 'Новая игра',
    wipeAsk: 'Всё стереть?',
    wipeYes: 'Да',
    wipeNo: 'Нет',

    /**
     * The two halves of the screen (**G9**). Headings rather than nothing,
     * because a card with four faces on it and a card with one are two
     * different offers, and the child has to be told which is which.
     */
    squadsTitle: 'Отряды',
    duelsTitle: 'Один на один',
    /**
     * How a squad takes turns, printed on its card. It changes the battle more
     * than anything else on the card does, so it is not left to be discovered.
     */
    squadShuffled: 'вперемешку',
    squadInTurn: 'по очереди',
  },

  fight: {
    vs: 'VS',
    leave: 'выйти',
  },

  result: {
    victoryTitle: 'Победа!',
    defeatTitle: (monster: string) => `${monster} победил`,
    victoryNote: (name: string) => `${name} справился!`,
    defeatNote: 'Ничего страшного — попробуем ещё раз',
    fightAgain: 'Ещё бой',
    rematch: 'Реванш',
    pickAnother: 'выбрать другого',
  },

  /**
   * The line above the pad. One at a time, freshest first (T18).
   *
   * `heard` is no longer a verdict but a mirror: it shows what recognition made
   * of what was said, while the answer itself waits in the field to be sent.
   */
  mic: {
    correct: 'верно',
    wrong: 'не то',
    heard: (text: string) => `услышал «${text}»`,
    unheard: 'не расслышал, скажи ещё разок',
    listening: '🎤 говори',
  },

  /**
   * The answer pad, always on screen (T18). Both ways in fill the same field,
   * so the hint names both, and neither of them sends anything by itself.
   */
  pad: {
    hint: 'скажи или набери',
    empty: '—',
    /** The label of the ⌫ key — the glyph itself is a sign, not a word. */
    erase: 'стереть',
    /**
     * The one button that answers — and in a battle (**G6**) answering IS the
     * blow, so it is named after the blow rather than after the form being
     * filled in. «Готово» described the paperwork; this describes what happens.
     * The sword beside it is drawn in the component, like the comparison signs.
     */
    submit: 'Атака',
  },

  /** Spoken by the teacher through speech synthesis (T12). */
  teacher: {
    label: 'Учитель',
    /** After a wrong answer — the child was heard, the answer was not right. */
    tryAgain: 'Попробуй ещё разок',
    theAnswerIs: (words: string) => `Правильно ${words}`,
    plus: 'плюс',
    minus: 'минус',
    /** Reads the equals sign of a «□ + 2 = 5» task out loud. */
    equals: 'равно',
    /**
     * Stands in for the missing number when the teacher reads a «□ + 2 = 5»
     * task: «какое число плюс два равно пять». Nominative, like every numeral
     * in the pack — the child hears the shape, not a grammar lesson.
     */
    whatNumber: 'какое число',
    /**
     * Read around a bracket. The child hears the grouping rather than seeing
     * it, so the words have to be unmistakable — school dictation form.
     */
    bracketOpen: 'открывается скобка',
    bracketClose: 'закрывается скобка',
    /**
     * A comparison read out loud. The three answers are named every single
     * time on purpose: a fight draws its kind of task afresh for each question,
     * so a comparison turns up among sums without warning and never settles
     * into a rhythm the child could answer from habit.
     */
    compare: (left: string, right: string) =>
      `Сравни. ${left} и ${right}. Больше, меньше или равно?`,
    /**
     * A number bond read out loud: «пять — это два и сколько?». Nominative, like
     * every numeral in the pack — the child hears the shape, not a grammar
     * lesson. Composition is commutative, so the known part is named first
     * whichever box it sits in.
     */
    compose: (whole: string, known: string) => `${whole} — это ${known} и сколько?`,
  },

  /**
   * How strong an opponent is, by its level (1–5), as the card says it.
   *
   * This is the one thing on a selection card that names the difficulty out
   * loud. It took over from the row of hearts, which named the *length* — and
   * length runs the other way (**G7**), so «Непобедимый» is also the shortest
   * battle on the screen. That is not a slip: the card now says how hard, and
   * says nothing about how long.
   *
   * A word and nothing else. Each of these was drawn with a coloured circle in
   * front of it — 🟢 through 🟤 — and it went: the word is already printed in
   * the level's colour, on a card framed in that same colour, so the circle was
   * the third copy of one fact and the widest of the three.
   *
   * The colour is not here. It is the card's own colour, and it lives with the
   * rest of what a level is worth, in `BY_LEVEL`.
   */
  strength: {
    1: 'Слабый',
    2: 'Равный',
    3: 'Сильный',
    4: 'Очень сильный',
    5: 'Непобедимый',
  } as Record<number, string>,

  /**
   * Math levels (C1). Debug and the parent screen, never shown to the child.
   *
   * Five entries today; the ladder grows upwards, and a rung with no line here
   * shows up as its own number rather than as nothing.
   */
  mathLevels: {
    1: '± в пределах 5',
    2: '± в пределах 10, без перехода',
    3: '± через десяток до 20, круглые десятки до 100',
    4: 'двузначные без перехода через разряд',
    5: 'двузначные с переходом через разряд',
  } as Record<number, string>,

  /**
   * Russian numerals 0–100.
   *
   * Used both ways: the teacher speaks them, and the recogniser is handed the
   * whole range of them as its grammar (T16).
   */
  numbers: {
    units: [
      'ноль',
      'один',
      'два',
      'три',
      'четыре',
      'пять',
      'шесть',
      'семь',
      'восемь',
      'девять',
    ],
    /** 10–19 */
    teens: [
      'десять',
      'одиннадцать',
      'двенадцать',
      'тринадцать',
      'четырнадцать',
      'пятнадцать',
      'шестнадцать',
      'семнадцать',
      'восемнадцать',
      'девятнадцать',
    ],
    /** 20, 30, … 90 */
    tens: [
      'двадцать',
      'тридцать',
      'сорок',
      'пятьдесят',
      'шестьдесят',
      'семьдесят',
      'восемьдесят',
      'девяносто',
    ],
    hundred: 'сто',
  },

  /**
   * The three answers to «5 □ 7», read left to right: пять МЕНЬШЕ семи.
   *
   * Here for the same reason `numbers` is: these words are both what the child
   * says into the microphone — the whole recognition grammar of a comparison
   * (T16) — and what the teacher reads back. Language, not logic. The signs
   * they stand for are not: `<`, `=` and `>` are the same in every language and
   * live in the code.
   */
  comparison: {
    less: 'меньше',
    equal: 'равно',
    greater: 'больше',
  },

  /**
   * The letter between the two boxes of a number bond — «2 И 3». It is shown on
   * screen and so it is language, unlike the lines of the bond, which are a
   * drawing and live in the component.
   */
  compose: {
    and: 'И',
  },

  /**
   * Monster display names, keyed by roster id (see src/game/monsters.ts).
   * Every id in the roster must appear here — there is a test for it.
   */
  monsters: {
    'forest-fairy': 'Лесная фея',

    // Humans
    peasant: 'Крестьянин',
    robber: 'Разбойник',
    swordsman: 'Мечник',
    archer: 'Лучник',
    priest: 'Священник',
    guardsman: 'Гвардеец',
    inquisitor: 'Инквизитор',
    paladin: 'Паладин',
    knight: 'Рыцарь',
    cavalryman: 'Кавалерист',
    archmage: 'Архимаг',
    pyromancer: 'Пиромаг',

    // Dwarves
    miner: 'Шахтёр',
    dwarf: 'Гном',
    alchemist: 'Алхимик',
    cannoneer: 'Пушкарь',
    giant: 'Гигант',

    // Elves
    elf: 'Эльф',
    pathfinder: 'Следопыт',
    druid: 'Друид',
    dryad: 'Дриада',
    ent: 'Энт',
    'ancient-ent': 'Древний Энт',
    unicorn: 'Единорог',
    'black-unicorn': 'Чёрный единорог',
    'frost-unicorn': 'Морозный единорог',
    avenger: 'Мститель',

    // Dark elves
    scout: 'Разведчик',
    'white-wolf': 'Белый волк',
    'dark-elf': 'Тёмный эльф',
    hunter: 'Охотник',
    'darkwood-ent': 'Энт темнолесья',
    'ancient-darkwood-ent': 'Древний Энт темнолесья',

    // Orcs
    goblin: 'Гоблин',
    'frenzied-goblin': 'Неистовый гоблин',
    'goblin-shaman': 'Гоблин-Шаман',
    orc: 'Орк',
    'orc-veteran': 'Орк-ветеран',
    'orc-hunter': 'Орк-охотник',
    'orc-chief': 'Орк-вождь',
    ogre: 'Огр',

    // Demons
    cerberus: 'Цербер',
    imp: 'Имп',
    'mocking-imp': 'Имп-насмешник',
    demoness: 'Демонесса',
    demon: 'Демон',
    executioner: 'Палач',
    archdemon: 'Архидемон',

    // Undead
    skeleton: 'Скелет',
    'skeleton-archer': 'Скелет-лучник',
    zombie: 'Зомби',
    'rotting-zombie': 'Гниющий зомби',
    ghost: 'Привидение',
    'cursed-ghost': 'Проклятое привидение',
    vampire: 'Вампир',
    'ancient-vampire': 'Древний вампир',
    'vampire-bat': 'Вампир-мышь',
    'ancient-vampire-bat': 'Древний вампир-мышь',
    'black-knight': 'Чёрный рыцарь',
    'bone-dragon': 'Костяной дракон',
    necromancer: 'Некромант',

    // Barbarians and beasts
    barbarian: 'Варвар',
    'mad-barbarian': 'Бешеный варвар',
    wolf: 'Волк',
    hyena: 'Гиена',
    bear: 'Медведь',
    'ancient-bear': 'Древний медведь',
    'polar-bear': 'Белый медведь',
    griffin: 'Грифон',
    'royal-griffin': 'Королевский грифон',
    beholder: 'Звероглаз',
    'evil-beholder': 'Злобоглаз',

    // Dragons and giants
    'black-dragon': 'Чёрный дракон',
    'emerald-dragon': 'Изумрудный дракон',
    'royal-thorn': 'Королевская Терния',

    // Spiders, snakes, small fry
    'frost-spider': 'Морозный паук',
    'fire-spider': 'Огненный паук',
    'dead-spider': 'Мёртвый паук',
    snake: 'Змея',
    'swamp-snake': 'Болотная змея',
    'ice-ball': 'Ледяной шар',
    'sea-devil': 'Морской дьявол',
    pirate: 'Пират',
    'ghost-pirate': 'Пират-призрак',

    // Lizards
    lizardman: 'Ящер',
    gobot: 'Гобот',
    'adult-gobot': 'Взрослый гобот',
    gorgul: 'Горгул',
    gorguana: 'Горгуана',
    'ghost-gorguana': 'Горгуана-призрак',
    haiterant: 'Хайтерант',
    gorgon: 'Горгон',
    brontor: 'Бронтор',
    't-rex': 'Тирекс',
    chosha: 'Чоша',

    // Northmen
    viking: 'Викинг',
    slinger: 'Пращник',
    'axe-thrower': 'Метатель топоров',
    berserker: 'Берсеркер',
    shieldmaiden: 'Северная воительница',
    mystic: 'Мистик',
    jarl: 'Ярл',
    jotun: 'Йотун',

    // Others
    minion: 'Прихвостень',
    observer: 'Созерцатель',
    'sky-guard': 'Небесный страж',
    assassin: 'Ассасин',
    amazon: 'Амазонка',
    shapeshifter: 'Метаморф',
    spy: 'Шпион',
    'mage-slayer': 'Убийца магов',
    'man-eating-wolf': 'Волк-людоед',
    demonologist: 'Демонолог',
    'lava-golem': 'Лавовый голем',
    nekroh: 'Некрох',
    'guard-droid': 'Дроид-страж',
  } as Record<string, string>,

  /**
   * Squad names, keyed by the id in src/game/squads.ts. Every squad in the
   * table must appear here — there is a test for it.
   *
   * Named for what stands in front of the child rather than for the sums
   * behind it: «Двое на тропе» is a thing to picture, «Два монстра 1 уровня»
   * is a spreadsheet row. What the battle is made of is on the card — the
   * faces, the hearts, and whether it is shuffled.
   */
  squads: {
    'two-on-the-path': 'Двое на тропе',
    'beast-pack': 'Звериная стая',
    'sky-watch': 'Небесный дозор',
    'motley-band': 'Сборная ватага',
  } as Record<string, string>,

  /** Phase 1 measuring rig. Developer tool, kept for when voice starts missing. */
  spike: {
    title: 'Полигон голосового ввода',
    subtitle: 'Фаза 1. Взрослый называет верный ответ вслух — тогда «мимо» означает промах распознавания, а не ошибку в счёте.',
    loading: 'Загружаю модель, 44 МБ…',
    error: (message: string) => `Ошибка: ${message}`,
    upTo: (max: number) => `до ${max}`,
    grammarSize: (count: number) => `${count} фраз в грамматике`,
    listening: '🎙 слушаю…',
    pressToSpeak: '🎤 нажми и скажи',
    orSpace: 'или пробел',
    heardCorrect: (heard: string) => `Услышал «${heard}» — верно`,
    heardWrong: (heard: string, parsed: number | null, expected: number) =>
      `Услышал «${heard}» → ${parsed}, а ждали ${expected}`,
    heardNothing: (heard: string | null) => `Не расслышал${heard ? ` («${heard}»)` : ''}`,
    ms: (value: number) => `${value} мс`,
    statAttempts: 'попыток',
    statHit: 'в точку',
    statMiss: 'мимо',
    statUnheard: 'не расслышал',
    copyLog: 'скопировать лог',
    clear: 'очистить',
    columnTask: 'пример',
    columnExpected: 'ждали',
    columnHeard: 'услышал',
    columnParsed: 'разобрал',
    columnMs: 'мс',
    empty: '—',
  },
}
