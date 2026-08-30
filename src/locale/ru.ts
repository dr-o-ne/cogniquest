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

  mic: {
    correct: 'верно',
    heard: (text: string) => `услышал «${text}»`,
    unheard: 'не расслышал, скажи ещё разок',
    listening: '🎤 говори',
  },

  /** Fallback number pad, revealed after two misses (T5). */
  pad: {
    hint: 'Давай пока наберём, а потом снова голосом',
    empty: '—',
    submit: 'готово',
  },

  /** Spoken by the teacher through speech synthesis (T12). */
  teacher: {
    label: 'Учитель',
    /** After a wrong answer — the child was heard, the answer was not right. */
    tryAgain: 'Попробуй ещё разок',
    /**
     * After a miss (C5). Deliberately different from the line above: the
     * microphone is at fault here, and the teacher says so. Same words in the
     * same tone would tell the child they got it wrong when they did not.
     */
    didNotCatch: 'Ой, я не расслышал. Скажи ещё разок',
    theAnswerIs: (words: string) => `Правильно ${words}`,
    plus: 'плюс',
    minus: 'минус',
  },

  /** What kind of fight a monster gives, by its level (G7). */
  battleHints: {
    1: 'Совсем просто, короткий бой',
    2: 'Простые примеры',
    3: 'Примеры посложнее',
    4: 'Трудные примеры',
    5: 'Босс: самые трудные',
  } as Record<number, string>,

  /** Math levels (C1). Debug and the parent screen, never shown to the child. */
  mathLevels: {
    1: '± в пределах 10',
    2: 'два действия в пределах 10',
    3: '± через десяток',
    4: 'круглые десятки',
    5: 'всё до 100',
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
    /**
     * Softens what comes back from recognition: case, «ё», punctuation and
     * words outside the grammar. Alphabet-specific, hence part of the locale.
     */
    normalise: (text: string): string =>
      text
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^а-я]+/g, ' ')
        .trim(),
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
