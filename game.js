const DESIGN_WIDTH = 2560;
const DESIGN_HEIGHT = 1440;
const VIEW_WIDTH = DESIGN_WIDTH;
const VIEW_HEIGHT = DESIGN_HEIGHT;
const FLOOR_Y = 1420;
const CHARACTER_SPEED = 13;
const CHARACTER_HEIGHT = 550;
const WALK_ANIM_SPEED = 40;
const INTERACTION_RANGE = 200;
const BUBBLE_MAX_WIDTH = 500;
const BUBBLE_PADDING = 10;
const BUBBLE_TAIL_W = 18;
const BUBBLE_TAIL_H = 14;
const CHOICE_BOX_WIDTH = 280;
const CHOICE_BOX_HEIGHT = 44;
const CHOICE_GAP = 8;
const CHOICE_OFFSET_X = -CHOICE_BOX_WIDTH - 80;
const THORN_REQUIRED_CLICKS = 10;
const THORN_JIGGLE_RANGE = 15;
const THORN_FADE_SPEED = 0.03;
const THORN_HOLD_DURATION = 180;
const CHARACTER_MAX_X = 11150;
const REWARD_FADE_SPEED = 0.04;
const REWARD_HOLD_DURATION = 120;
const MINIGAME_THORN_HEIGHT = 1000;

// 책 UI 관련 상수
const BOOK_ICON_SIZE = 200;
const BOOK_ICON_MARGIN = 24;
const BOOK_HOVER_SCALE = 1.15;
const BOOK_PAGE_HEIGHT = 1300;

const app = new PIXI.Application({
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    resolution: Math.max(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    antialias: true,
});

document.getElementById('game-container').appendChild(app.view);

const bgLayer = new PIXI.Container();
const mainLayer = new PIXI.Container();
const fgLayer = new PIXI.Container();
mainLayer.sortableChildren = true;

app.stage.addChild(bgLayer);
app.stage.addChild(mainLayer);
app.stage.addChild(fgLayer);

let inDialogue = false;
let currentNPC = null;
const keys = { Left: false, Right: false, Talk: false };

let WORLD_WIDTH = 0;
let character;
let charTextures = [];
let charBaseScale = 1;
let walkFrameTimer = 0;
let walkFrameIndex = 0;
let facing = 1;
let isMoving = false;
let idleHintText;

const npcs = [];
let currentNodeId = null;
let dialogueBubble;
let bubbleBg;
let bubbleText;
let endDialogueText;
let choiceContainer;
let rewardPopupContainer;
let loadedTextures = null;

let rewardItemSprite = null;
let rewardFadingIn = false;
let rewardFadingOut = false;
let rewardHolding = false;
let rewardHoldTimer = 0;

// 교감 효과
let bondEffectContainer;
let bondDotsGraphics;
let bondEffectActive = false;
let bondEffectTimer = 0;
let bondNextNode = null;

// 가시 미니게임
const MINIGAME_TULL_HEIGHT = 1000;
let minigameOverlay;
let minigameTullSprite;
let minigameThornSprite;
let thornHintText;
let thornClickCount = 0;
let minigameActive = false;
let minigameNextNode = null;
let thornFading = false;
let thornHolding = false;
let thornHoldTimer = 0;

// 책 UI 및 매칭 미니게임 전역 변수
let bookIconSprite;
let bookOverlay;
let bookPageSprite;
let bookCloseText;
let bookActive = false;
let bookGuideText;

// 패턴 드래그 연결 관련 전역 변수
let patternGraphics;
let leftDots = [];
let rightDots = [];
let userConnections = [];
let activeStartDot = null;
let currentMousePos = { x: 0, y: 0 };
let isDraggingLine = false;
let goodPageSprite = null;

// 엔딩(good.PNG) 연출 관련 전역 변수
let isEndingSequence = false;
let endingPhase = 0;
let endingTimer = 0;
let endingFlashBg = null;
let endingHaloGraphics = null;
let endingParticlesContainer = null;
let endingParticles = [];

// 정답 매칭 데이터 (Left ID -> Right ID)
const CORRECT_PAIRS = {
    'L1': 'R1',
    'L2': 'R2',
    'L3': 'R3',
    'L4': 'R4'
};

const ASSET_PATHS = {
    bg: './bg.PNG',
    fg: './1bg.PNG',
    npcMain: './npc.PNG',
    npcTull: './tull.PNG',
    npcWolf: './wolf.PNG',
    npcDragon: './dragon.PNG',
    charWalk1: './main1.PNG',
    charWalk2: './main2.PNG',
    fruit: './Bearberry.jpg',
    tullThorn: './tull_thorn.PNG',
    thorn: './thorn.PNG',
    tullHappy: './tull_happy.PNG',
    leaf: './leaf.PNG',
    worm: './worm.PNG',
    book: './book.PNG',
    bookPage: './book_page.PNG',
    goodPage: './good.PNG'
};

async function loadGameAssets() {
    try {
        const textures = await PIXI.Assets.load([
            { alias: 'bg', src: ASSET_PATHS.bg },
            { alias: 'fg', src: ASSET_PATHS.fg },
            { alias: 'npcMain', src: ASSET_PATHS.npcMain },
            { alias: 'npcTull', src: ASSET_PATHS.npcTull },
            { alias: 'npcWolf', src: ASSET_PATHS.npcWolf },
            { alias: 'npcDragon', src: ASSET_PATHS.npcDragon },
            { alias: 'charWalk1', src: ASSET_PATHS.charWalk1 },
            { alias: 'charWalk2', src: ASSET_PATHS.charWalk2 },
            { alias: 'fruit', src: ASSET_PATHS.fruit },
            { alias: 'tullThorn', src: ASSET_PATHS.tullThorn },
            { alias: 'thorn', src: ASSET_PATHS.thorn },
            { alias: 'tullHappy', src: ASSET_PATHS.tullHappy },
            { alias: 'leaf', src: ASSET_PATHS.leaf },
            { alias: 'worm', src: ASSET_PATHS.worm },
            { alias: 'book', src: ASSET_PATHS.book },
            { alias: 'bookPage', src: ASSET_PATHS.bookPage },
            { alias: 'goodPage', src: ASSET_PATHS.goodPage }
        ]);

        loadedTextures = textures;

        createImageBackgrounds(textures);
        createCharacter(textures);
        createNPCs(textures);
        init();
    } catch (error) {
        console.error("이미지 로드 실패:", error);
        createFallbackBackground();
        init();
    }
}

function createImageBackgrounds(textures) {
    const bgSprite = new PIXI.Sprite(textures.bg);
    const bgScale = VIEW_HEIGHT / bgSprite.texture.height;
    bgSprite.width = bgSprite.texture.width * bgScale;
    bgSprite.height = VIEW_HEIGHT;
    bgLayer.addChild(bgSprite);

    WORLD_WIDTH = bgSprite.width;

    const fgSprite = new PIXI.Sprite(textures.fg);
    const fgScale = VIEW_HEIGHT / fgSprite.texture.height;
    fgSprite.width = fgSprite.texture.width * fgScale;
    fgSprite.height = VIEW_HEIGHT;
    fgLayer.addChild(fgSprite);
}

function createCharacter(textures) {
    charTextures = [textures.charWalk1, textures.charWalk2];

    character = new PIXI.Sprite(charTextures[0]);
    character.anchor.set(0.5, 1);
    charBaseScale = CHARACTER_HEIGHT / character.texture.height;
    character.scale.set(charBaseScale);

    character.x = 150;
    character.y = FLOOR_Y;

    mainLayer.addChild(character);
}

function createNPCs(textures) {
    const npcData = [
        { key: 'npc1', texture: textures.npcMain,   triggerX: 1530,  dialogueId: 'npc1' },
        { key: 'npc2', texture: textures.npcTull,   triggerX: 11300, dialogueId: 'tull' },
        { key: 'npc3', texture: textures.npcWolf,   triggerX: 7139, dialogueId: 'wolf' },
        { key: 'npc4', texture: textures.npcDragon, triggerX: 3849, dialogueId: 'dragon', bubbleOffsetY: -150 },
    ];

    npcData.forEach((data) => {
        const sprite = new PIXI.Sprite(data.texture);
        sprite.anchor.set(0, 0);
        const scale = VIEW_HEIGHT / sprite.texture.height;
        sprite.width = sprite.texture.width * scale;
        sprite.height = VIEW_HEIGHT;
        sprite.x = 0;
        sprite.y = 0;

        mainLayer.addChild(sprite);

        const promptText = new PIXI.Text('E를 눌러 대화', {
            fontFamily: 'Dongle',
            fontSize: 30,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 2,
        });
        promptText.anchor.set(0.5, 1);
        promptText.x = data.triggerX;
        promptText.y = FLOOR_Y - CHARACTER_HEIGHT - 20;
        promptText.visible = false;
        mainLayer.addChild(promptText);

        npcs.push({
            id: data.key,
            triggerX: data.triggerX,
            sprite: { x: data.triggerX, y: FLOOR_Y },
            dialogueId: data.dialogueId,
            promptText: promptText,
            bubbleOffsetY: data.bubbleOffsetY || 0,
        });
    });
}

function getNearbyNPC() {
    for (const npc of npcs) {
        if (Math.abs(character.x - npc.triggerX) < INTERACTION_RANGE) {
            return npc;
        }
    }
    return null;
}

function createDialogueUI() {
    dialogueBubble = new PIXI.Container();
    bubbleBg = new PIXI.Graphics();

 bubbleText = new PIXI.HTMLText('', {
    fontFamily: 'Dongle',
    fontSize: 30,
    fill: '#222222',
    align: 'center',
    lineHeight: 42,
    wordWrap: true,
    wordWrapWidth: BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 3,
    resolution: window.devicePixelRatio || 2
});
    
    dialogueBubble.addChild(bubbleBg);
    dialogueBubble.addChild(bubbleText);

    endDialogueText = new PIXI.Text('그만 대화하기', {
        fontFamily: 'Dongle',
        fontSize: 20,
        fill: 0x888888,
    });
    endDialogueText.eventMode = 'static';
    endDialogueText.cursor = 'pointer';
    endDialogueText.on('pointertap', endDialogue);
    dialogueBubble.addChild(endDialogueText);

    dialogueBubble.visible = false;
    dialogueBubble.eventMode = 'static';
    dialogueBubble.cursor = 'pointer';
    dialogueBubble.on('pointertap', advanceDialogue);

    mainLayer.addChild(dialogueBubble);

    choiceContainer = new PIXI.Container();
    choiceContainer.visible = false;
    mainLayer.addChild(choiceContainer);

    rewardPopupContainer = new PIXI.Container();
    rewardPopupContainer.visible = false;
    rewardPopupContainer.zIndex = 100;
    app.stage.addChild(rewardPopupContainer);

    bondEffectContainer = new PIXI.Container();
    bondDotsGraphics = new PIXI.Graphics();
    bondEffectContainer.addChild(bondDotsGraphics);
    bondEffectContainer.visible = false;
    bondEffectContainer.zIndex = 200;
    app.stage.addChild(bondEffectContainer);

    dialogueBubble.zIndex = 20;
    choiceContainer.zIndex = 20;

    minigameOverlay = new PIXI.Graphics();
    minigameOverlay.beginFill(0x000000, 0.6);
    minigameOverlay.drawRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    minigameOverlay.endFill();
    minigameOverlay.visible = false;
    app.stage.addChild(minigameOverlay);

    minigameTullSprite = new PIXI.Sprite();
    minigameTullSprite.anchor.set(0.5);
    minigameTullSprite.x = VIEW_WIDTH / 2;
    minigameTullSprite.y = VIEW_HEIGHT / 2;
    minigameTullSprite.visible = false;
    app.stage.addChild(minigameTullSprite);

    minigameThornSprite = new PIXI.Sprite();
    minigameThornSprite.anchor.set(0.5);
    minigameThornSprite.x = VIEW_WIDTH / 2;
    minigameThornSprite.y = VIEW_HEIGHT / 2 - 40;
    minigameThornSprite.eventMode = 'static';
    minigameThornSprite.cursor = 'pointer';
    minigameThornSprite.visible = false;
    minigameThornSprite.on('pointertap', onThornClick);
    app.stage.addChild(minigameThornSprite);

    thornHintText = new PIXI.Text('', {
        fontFamily: 'Dongle',
        fontSize: 28,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 3,
    });
    thornHintText.anchor.set(0.5, 1);
    thornHintText.x = VIEW_WIDTH / 2;
    thornHintText.y = VIEW_HEIGHT / 5 - 150;
    thornHintText.visible = false;
    app.stage.addChild(thornHintText);

    idleHintText = new PIXI.Text('◀︎ ▶︎ 키를 눌러 움직이고 말풍선을 클릭해 대화하세요!', {
        fontFamily: 'Dongle',
        fontSize: 50,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 3,
        padding: 10,
    });
    idleHintText.anchor.set(0.5, 0);
    idleHintText.x = VIEW_WIDTH / 2;
    idleHintText.y = 60;
    idleHintText.visible = false;
    app.stage.addChild(idleHintText);

    // 책 아이콘
    bookIconSprite = new PIXI.Sprite(loadedTextures.book);
    bookIconSprite.anchor.set(0, 0);
    const bookScale = BOOK_ICON_SIZE / bookIconSprite.texture.height;
    bookIconSprite.scale.set(bookScale);
    bookIconSprite.x = BOOK_ICON_MARGIN;
    bookIconSprite.y = BOOK_ICON_MARGIN;
    bookIconSprite.eventMode = 'static';
    bookIconSprite.cursor = 'pointer';
    bookIconSprite.zIndex = 300;

    bookIconSprite.on('pointerover', () => {
        bookIconSprite.scale.set(bookScale * BOOK_HOVER_SCALE);
    });
    bookIconSprite.on('pointerout', () => {
        bookIconSprite.scale.set(bookScale);
    });
    bookIconSprite.on('pointertap', openBook);

    app.stage.addChild(bookIconSprite);

    // 책 오버레이 레이어
    bookOverlay = new PIXI.Graphics();
    bookOverlay.beginFill(0x000000, 0.6);
    bookOverlay.drawRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    bookOverlay.endFill();
    bookOverlay.visible = false;
    bookOverlay.zIndex = 400;
    bookOverlay.eventMode = 'static';
    app.stage.addChild(bookOverlay);

    bookPageSprite = new PIXI.Sprite();
    bookPageSprite.anchor.set(0.5);
    bookPageSprite.x = VIEW_WIDTH / 2;
    bookPageSprite.y = VIEW_HEIGHT / 2;
    bookPageSprite.visible = false;
    bookPageSprite.zIndex = 401;
    app.stage.addChild(bookPageSprite);

    bookGuideText = new PIXI.Text('친구들과 대화를 하고 알맞게 연결하세요!', {
        fontFamily: 'Dongle',
        fontSize: 42,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 4,
    });
    bookGuideText.anchor.set(0.5, 0);
    bookGuideText.visible = false;
    bookGuideText.zIndex = 405;
    app.stage.addChild(bookGuideText);

    patternGraphics = new PIXI.Graphics();
    patternGraphics.zIndex = 403;
    patternGraphics.visible = false;
    app.stage.addChild(patternGraphics);

    // 엔딩 애니메이션용 레이어 (Good Page 뒤에 위치하도록 zIndex 408, 409 적용)
    endingHaloGraphics = new PIXI.Graphics();
    endingHaloGraphics.zIndex = 408;
    endingHaloGraphics.eventMode = 'none';
    endingHaloGraphics.visible = false;
    app.stage.addChild(endingHaloGraphics);

    endingParticlesContainer = new PIXI.Container();
    endingParticlesContainer.zIndex = 409;
    endingParticlesContainer.eventMode = 'none';
    endingParticlesContainer.visible = false;
    app.stage.addChild(endingParticlesContainer);

    goodPageSprite = new PIXI.Sprite(loadedTextures.goodPage);
    goodPageSprite.anchor.set(0.5);
    goodPageSprite.x = VIEW_WIDTH / 2;
    goodPageSprite.y = VIEW_HEIGHT / 2;
    goodPageSprite.visible = false;
    goodPageSprite.zIndex = 410;
    app.stage.addChild(goodPageSprite);

    endingFlashBg = new PIXI.Graphics();
    endingFlashBg.beginFill(0xffffff);
    endingFlashBg.drawRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    endingFlashBg.endFill();
    endingFlashBg.alpha = 0;
    endingFlashBg.zIndex = 415;
    endingFlashBg.eventMode = 'none';
    endingFlashBg.visible = false;
    app.stage.addChild(endingFlashBg);

    // 닫기 버튼 (X) - 최상단 zIndex 420
    bookCloseText = new PIXI.Text('X', {
        fontFamily: 'Dongle',
        fontSize: 48,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 3,
    });
    bookCloseText.anchor.set(0.5);
    bookCloseText.eventMode = 'static';
    bookCloseText.cursor = 'pointer';
    bookCloseText.visible = false;
    bookCloseText.zIndex = 420;
    bookCloseText.on('pointertap', closeBook);
    app.stage.addChild(bookCloseText);

    app.stage.eventMode = 'static';
    app.stage.on('pointermove', onPointerMove);
    app.stage.on('pointerup', onPointerUp);
}

function drawBubbleShape(width, height) {
    bubbleBg.clear();
    bubbleBg.beginFill(0xffffff, 0.95);
    bubbleBg.drawRoundedRect(-width / 2, -(height + BUBBLE_TAIL_H), width, height, 12);
    bubbleBg.endFill();

    bubbleBg.beginFill(0xffffff, 0.95);
    bubbleBg.moveTo(-BUBBLE_TAIL_W / 2, -BUBBLE_TAIL_H);
    bubbleBg.lineTo(BUBBLE_TAIL_W / 2, -BUBBLE_TAIL_H);
    bubbleBg.lineTo(0, 0);
    bubbleBg.closePath();
    bubbleBg.endFill();
}

function showBubble(speakerSprite, text, offsetY = 0) {
    bubbleText.text = text;

    const width = BUBBLE_MAX_WIDTH;
    const contentHeight = Math.max(bubbleText.height, 40);
    const height = contentHeight + BUBBLE_PADDING * 2;

    drawBubbleShape(width, height);

    endDialogueText.anchor.set(1, 0);
    endDialogueText.x = width / 2 - 8;
    endDialogueText.y = -(height + BUBBLE_TAIL_H) + 6;

    bubbleText.anchor.set(0.5, 0);
    bubbleText.x = 0;
    bubbleText.y = -(height + BUBBLE_TAIL_H) + BUBBLE_PADDING;

    dialogueBubble.x = speakerSprite.x + mainLayer.x;
    dialogueBubble.y = speakerSprite.y - CHARACTER_HEIGHT - 10 + offsetY;

    dialogueBubble.visible = true;
    app.stage.addChild(dialogueBubble);
}

function showChoices(options) {
    clearChoices();

    const screenCharX = character.x + mainLayer.x;
    const screenCharY = character.y;
    const startY = screenCharY - CHARACTER_HEIGHT * 0.7;

    options.forEach((option, i) => {
        const box = new PIXI.Graphics();
        box.beginFill(0xffffff, 0.95);
        box.drawRoundedRect(0, 0, CHOICE_BOX_WIDTH, CHOICE_BOX_HEIGHT, 8);
        box.endFill();

        box.x = screenCharX + CHOICE_OFFSET_X;
        box.y = startY - i * (CHOICE_BOX_HEIGHT + CHOICE_GAP);

        const label = new PIXI.HTMLText(option.text, {
            fontFamily: 'Dongle',
            fontSize: 25,
            fill: 0x222222,
            wordWrap: true,
            wordWrapWidth: CHOICE_BOX_WIDTH - 16,
            align: 'center',
        });
        label.anchor.set(0.5);
        label.x = CHOICE_BOX_WIDTH / 2;
        label.y = CHOICE_BOX_HEIGHT / 2;
        box.addChild(label);

        box.eventMode = 'static';
        box.cursor = 'pointer';
        box.on('pointertap', () => selectOption(option));

        choiceContainer.addChild(box);
    });

    choiceContainer.visible = true;
    app.stage.addChild(choiceContainer);
}

function clearChoices() {
    choiceContainer.removeChildren();
    choiceContainer.visible = false;
}

function hideBubble() {
    dialogueBubble.visible = false;
}

function showRewardImage(texture) {
    rewardFadingOut = false;
    rewardHolding = false;
    rewardHoldTimer = 0;

    rewardPopupContainer.removeChildren();

    const itemSprite = new PIXI.Sprite(texture);
    itemSprite.anchor.set(0.5);
    itemSprite.x = VIEW_WIDTH / 2;
    itemSprite.y = VIEW_HEIGHT / 2 - 50;

    const targetSize = 1000;
    const scale = targetSize / Math.max(itemSprite.texture.width, itemSprite.texture.height);
    itemSprite.scale.set(scale);

    itemSprite.alpha = 0;

    rewardPopupContainer.addChild(itemSprite);
    rewardPopupContainer.visible = true;

    rewardItemSprite = itemSprite;
    rewardFadingIn = true;

    app.stage.addChild(rewardPopupContainer);
}

function hideRewardImage() {
    if (rewardItemSprite && rewardPopupContainer.visible) {
        rewardFadingIn = false;
        rewardFadingOut = true;
    } else {
        rewardPopupContainer.visible = false;
        rewardPopupContainer.removeChildren();
        rewardItemSprite = null;
        rewardFadingIn = false;
        rewardFadingOut = false;
        rewardHolding = false;
        rewardHoldTimer = 0;
    }
}

function startBondEffect(nextNodeId) {
    bondEffectActive = true;
    bondNextNode = nextNodeId;
    bondEffectTimer = 0;

    hideBubble();
    clearChoices();

    bondEffectContainer.alpha = 0;
    bondEffectContainer.visible = true;
    app.stage.addChild(bondEffectContainer);
}

function updateBondEffect() {
    if (!bondEffectActive) return;

    bondEffectTimer++;

    bondDotsGraphics.clear();
    const spacing = 24;
    const cols = Math.ceil(VIEW_WIDTH / spacing);
    const rows = Math.ceil(VIEW_HEIGHT / spacing);
    const time = bondEffectTimer * 0.08;

    bondDotsGraphics.beginFill(0x9b59b6, 0.7);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * spacing;
            const y = r * spacing;

            const wave = Math.sin(c * 0.15 + time) + Math.cos(r * 0.15 + time);
            const radius = Math.max(1, (wave + 1.2) * 5);

            if (wave > -0.2) {
                bondDotsGraphics.drawCircle(x, y, radius);
            }
        }
    }
    bondDotsGraphics.endFill();

    if (bondEffectTimer <= 30) {
        bondEffectContainer.alpha = bondEffectTimer / 30;
    } else if (bondEffectTimer >= 270) {
        bondEffectContainer.alpha = (300 - bondEffectTimer) / 30;
    } else {
        bondEffectContainer.alpha = 1;
    }

    if (bondEffectTimer >= 300) {
        bondEffectActive = false;
        bondEffectContainer.visible = false;
        currentNodeId = bondNextNode;
        showDialogueNode();
    }
}

function createFallbackBackground() {
    const bg = new PIXI.Graphics();
    bg.beginFill(0x2c3e50);
    bg.drawRect(0, 0, WORLD_WIDTH || VIEW_WIDTH, VIEW_HEIGHT);
    bg.endFill();

    const text = new PIXI.Text("이미지 로드에 실패했습니다.", {
        fontFamily: 'Dongle',
        fontSize: 24,
        fill: 0xffffff,
        align: 'center'
    });
    text.x = VIEW_WIDTH / 2 - text.width / 2;
    text.y = VIEW_HEIGHT / 2 - text.height / 2;

    mainLayer.addChild(bg);
    mainLayer.addChild(text);
}

function setupKeyboard() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft') keys.Left = true;
        if (e.code === 'ArrowRight') keys.Right = true;
        if (e.code === 'KeyE') keys.Talk = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft') keys.Left = false;
        if (e.code === 'ArrowRight') keys.Right = false;
        if (e.code === 'KeyE') {
            if (!inDialogue) {
                const npc = getNearbyNPC();
                if (npc) startDialogue(npc);
            }
        }

        if (e.code === 'Space') {
            if (inDialogue) {
                e.preventDefault();
                advanceDialogue();
            }
        }

        if (e.code === 'Escape') {
            if (inDialogue) {
                endDialogue();
            }
            if (bookActive) {
                closeBook();
            }
        }
    });
}

function updateIdleHint() {
    idleHintText.visible = !isMoving && !inDialogue && !minigameActive && !bondEffectActive && !bookActive;
}

function updateCharacter(delta) {
    if (!character) return;
    if (inDialogue) {
        isMoving = false;
        return;
    }

    isMoving = false;

    if (keys.Left) {
        character.x -= CHARACTER_SPEED * delta;   // delta 곱하기 추가
        facing = -1;
        isMoving = true;
    }
    if (keys.Right) {
        character.x += CHARACTER_SPEED * delta;   // delta 곱하기 추가
        facing = 1;
        isMoving = true;
    }

    const halfWidth = (character.texture.width * charBaseScale) / 2;
    character.x = Math.max(halfWidth, Math.min(CHARACTER_MAX_X, character.x));
    character.scale.x = charBaseScale * facing;

    if (isMoving && charTextures.length === 2) {
        walkFrameTimer++;
        if (walkFrameTimer >= WALK_ANIM_SPEED) {
            walkFrameTimer = 0;
            walkFrameIndex = 1 - walkFrameIndex;
            character.texture = charTextures[walkFrameIndex];
        }
    } else {
        walkFrameTimer = 0;
        walkFrameIndex = 0;
        character.texture = charTextures[0];
    }

    character.zIndex = 5;
}

function updateCamera() {
    if (!character) return;

    let targetX = VIEW_WIDTH / 2 - character.x;
    const minX = VIEW_WIDTH - WORLD_WIDTH;
    const maxX = 0;
    targetX = Math.max(minX, Math.min(maxX, targetX));

    mainLayer.x = targetX;
    bgLayer.x = targetX;
    fgLayer.x = targetX;
}

function updateInteractionPrompts() {
    const nearby = getNearbyNPC();
    npcs.forEach((npc) => {
        npc.promptText.visible = (!inDialogue && npc === nearby);
    });
}

function startDialogue(npc) {
    inDialogue = true;
    currentNPC = npc;
    currentNodeId = 'start';
    showDialogueNode();
}

function showDialogueNode() {
    const tree = dialogues[currentNPC.dialogueId];
    if (!tree) {
        endDialogue();
        return;
    }
    const node = tree[currentNodeId];
    if (!node) {
        endDialogue();
        return;
    }

    if (node.type === 'minigame') {
        startThornMinigame(node.next);
        return;
    }

    if (node.type === 'effect') {
        startBondEffect(node.next);
        return;
    }

    const speakerSprite = (node.by === 'player') ? character : currentNPC.sprite;
    const offsetY = (node.by === 'player') ? 0 : (currentNPC.bubbleOffsetY || 0);
    showBubble(speakerSprite, node.text, offsetY);

    if (node.image && loadedTextures && loadedTextures[node.image]) {
        showRewardImage(loadedTextures[node.image]);
    } else {
        hideRewardImage();
    }

    if (node.options && node.options.length > 0) {
        dialogueBubble.eventMode = 'none';
        showChoices(node.options);
    } else {
        dialogueBubble.eventMode = 'static';
        clearChoices();
    }
}

function selectOption(option) {
    if (option.next === null) {
        endDialogue();
    } else {
        currentNodeId = option.next;
        showDialogueNode();
    }
}

function endDialogue() {
    inDialogue = false;
    currentNPC = null;
    hideBubble();
    clearChoices();
    hideRewardImage();
}

function advanceDialogue() {
    if (!inDialogue) return;

    const tree = dialogues[currentNPC.dialogueId];
    if (!tree) return;
    const node = tree[currentNodeId];

    if (node && node.options && node.options.length > 0) return;

    if (node.next === undefined || node.next === null) {
        endDialogue();
    } else {
        currentNodeId = node.next;
        showDialogueNode();
    }
}

function startThornMinigame(nextNodeId) {
    minigameActive = true;
    minigameNextNode = nextNodeId;
    thornClickCount = 0;
    thornFading = false;
    thornHolding = false;
    thornHoldTimer = 0;

    hideBubble();
    clearChoices();

    minigameTullSprite.texture = loadedTextures.tullThorn;
    minigameTullSprite.alpha = 1;
    minigameTullSprite.visible = true;
    minigameTullSprite.scale.set(MINIGAME_TULL_HEIGHT / minigameTullSprite.texture.height);

    minigameThornSprite.texture = loadedTextures.thorn;
    minigameThornSprite.alpha = 1;
    minigameThornSprite.eventMode = 'static';
    minigameThornSprite.visible = true;
    minigameThornSprite.scale.set(MINIGAME_THORN_HEIGHT / minigameThornSprite.texture.height);

    minigameOverlay.visible = true;

    thornHintText.text = `가시를 클릭해서 빼주자! (0/${THORN_REQUIRED_CLICKS})`;
    thornHintText.visible = true;
}

function onThornClick() {
    if (!minigameActive || thornFading) return;

    thornClickCount++;

    minigameThornSprite.x = VIEW_WIDTH / 2 + (Math.random() * THORN_JIGGLE_RANGE * 2 - THORN_JIGGLE_RANGE);
    minigameThornSprite.y = (VIEW_HEIGHT / 2 - 40) + (Math.random() * THORN_JIGGLE_RANGE * 2 - THORN_JIGGLE_RANGE);

    thornHintText.text = `가시를 클릭해서 빼주자! (${thornClickCount}/${THORN_REQUIRED_CLICKS})`;

    if (thornClickCount >= THORN_REQUIRED_CLICKS) {
        thornFading = true;
        minigameThornSprite.eventMode = 'none';
        thornHintText.visible = false;
        minigameTullSprite.texture = loadedTextures.tullHappy;
        minigameTullSprite.scale.set(MINIGAME_TULL_HEIGHT / minigameTullSprite.texture.height);
    }
}

function updateThornFade() {
    if (thornFading) {
        minigameThornSprite.alpha -= THORN_FADE_SPEED;

        if (minigameThornSprite.alpha <= 0) {
            minigameThornSprite.alpha = 0;
            thornFading = false;
            thornHolding = true;
            thornHoldTimer = 0;
        }
        return;
    }

    if (thornHolding) {
        thornHoldTimer++;
        if (thornHoldTimer >= THORN_HOLD_DURATION) {
            thornHolding = false;
            finishThornMinigame();
        }
    }
}

function updateRewardFade() {
    if (rewardFadingIn && rewardItemSprite) {
        rewardItemSprite.alpha += REWARD_FADE_SPEED;
        if (rewardItemSprite.alpha >= 1) {
            rewardItemSprite.alpha = 1;
            rewardFadingIn = false;
            rewardHolding = true;
            rewardHoldTimer = 0;
        }
        return;
    }

    if (rewardHolding) {
        rewardHoldTimer++;
        if (rewardHoldTimer >= REWARD_HOLD_DURATION) {
            rewardHolding = false;
            rewardFadingOut = true;
        }
        return;
    }

    if (rewardFadingOut && rewardItemSprite) {
        rewardItemSprite.alpha -= REWARD_FADE_SPEED;
        if (rewardItemSprite.alpha <= 0) {
            rewardItemSprite.alpha = 0;
            rewardFadingOut = false;

            rewardPopupContainer.visible = false;
            rewardPopupContainer.removeChildren();
            rewardItemSprite = null;
        }
    }
}

function finishThornMinigame() {
    minigameActive = false;
    thornFading = false;

    minigameOverlay.visible = false;
    minigameTullSprite.visible = false;
    minigameThornSprite.visible = false;

    currentNodeId = minigameNextNode;
    showDialogueNode();
}

function openBook() {
    if (inDialogue || minigameActive || bondEffectActive) return;

    bookActive = true;

    const pageTexture = loadedTextures.bookPage;
    bookPageSprite.texture = pageTexture;
    const scale = BOOK_PAGE_HEIGHT / pageTexture.height;
    bookPageSprite.scale.set(scale);

    bookOverlay.visible = true;
    bookPageSprite.visible = true;

    const pageWidth = pageTexture.width * scale;
    const topY = VIEW_HEIGHT / 2 - BOOK_PAGE_HEIGHT / 2;

    bookGuideText.x = VIEW_WIDTH / 2;
    bookGuideText.y = topY - 20;
    bookGuideText.visible = true;

    bookCloseText.x = VIEW_WIDTH / 2 + pageWidth / 2 - 20;
    bookCloseText.y = topY + 20;
    bookCloseText.visible = true;

    bookIconSprite.visible = false;

    createPatternDots(scale);
    patternGraphics.visible = true;
    userConnections = [];
    drawPatternLines();
}

// 점 위치 좌표 조절 가능 함수
function createPatternDots(scale) {
    clearPatternDots();

    const bookCenterX = VIEW_WIDTH / 2;
    const bookCenterY = VIEW_HEIGHT / 2;

    // 💡 필요 시 여기의 180, 160 값을 조절하여 점의 좌우 위치를 변경 가능합니다.
    const leftX = bookCenterX - 180 * scale;
    const rightX = bookCenterX + 160 * scale;

    // 💡 필요 시 Y축 간격을 조절 가능합니다.
    const yPositions = [
        bookCenterY - 630 * scale,
        bookCenterY - 210 * scale,
        bookCenterY + 210 * scale,
        bookCenterY + 630 * scale
    ];

    for (let i = 0; i < 4; i++) {
        const dot = createSingleDot(`L${i + 1}`, leftX, yPositions[i], 'left');
        leftDots.push(dot);
    }

    const rightIds = ['R3', 'R4', 'R1', 'R2'];
    for (let i = 0; i < 4; i++) {
        const dot = createSingleDot(rightIds[i], rightX, yPositions[i], 'right');
        rightDots.push(dot);
    }
}

function createSingleDot(id, x, y, side) {
    const dotGraphics = new PIXI.Graphics();
    dotGraphics.beginFill(0xeb4d4b, 0.9);
    dotGraphics.drawCircle(0, 0, 16);
    dotGraphics.endFill();

    dotGraphics.x = x;
    dotGraphics.y = y;
    dotGraphics.eventMode = 'static';
    dotGraphics.cursor = 'pointer';
    dotGraphics.zIndex = 404;

    dotGraphics.dotData = { id, side, x, y };

    dotGraphics.on('pointerdown', (e) => onDotPointerDown(e, dotGraphics));

    app.stage.addChild(dotGraphics);
    return dotGraphics;
}

function clearPatternDots() {
    leftDots.forEach(d => d.destroy());
    rightDots.forEach(d => d.destroy());
    leftDots = [];
    rightDots = [];
}

function onDotPointerDown(e, dot) {
    if (userConnections.some(c => c.from === dot || c.to === dot)) return;

    isDraggingLine = true;
    activeStartDot = dot;
    currentMousePos = e.data.global;
}

function onPointerMove(e) {
    if (!isDraggingLine) return;
    currentMousePos = e.data.global;
    drawPatternLines();
}

function onPointerUp(e) {
    if (!isDraggingLine) return;
    isDraggingLine = false;

    const mousePos = e.data.global;
    const allDots = [...leftDots, ...rightDots];
    let targetDot = null;

    for (let dot of allDots) {
        if (dot === activeStartDot) continue;
        const dx = dot.x - mousePos.x;
        const dy = dot.y - mousePos.y;
        if (Math.sqrt(dx * dx + dy * dy) < 35) {
            targetDot = dot;
            break;
        }
    }

    if (targetDot && activeStartDot.dotData.side !== targetDot.dotData.side) {
        if (!userConnections.some(c => c.from === targetDot || c.to === targetDot)) {
            userConnections.push({ from: activeStartDot, to: targetDot });
        }
    }

    activeStartDot = null;
    drawPatternLines();

    if (userConnections.length === 4) {
        checkPatternResult();
    }
}

function drawPatternLines(customColor = null) {
    patternGraphics.clear();

    userConnections.forEach(conn => {
        patternGraphics.lineStyle(12, customColor || 0xeb4d4b, 0.9);
        patternGraphics.moveTo(conn.from.x, conn.from.y);
        patternGraphics.lineTo(conn.to.x, conn.to.y);
    });

    if (isDraggingLine && activeStartDot) {
        patternGraphics.lineStyle(12, 0xeb4d4b, 0.6);
        patternGraphics.moveTo(activeStartDot.x, activeStartDot.y);
        patternGraphics.lineTo(currentMousePos.x, currentMousePos.y);
    }
}

function checkPatternResult() {
    let isCorrect = true;

    for (let conn of userConnections) {
        let leftDot = conn.from.dotData.side === 'left' ? conn.from : conn.to;
        let rightDot = conn.from.dotData.side === 'right' ? conn.from : conn.to;

        if (CORRECT_PAIRS[leftDot.dotData.id] !== rightDot.dotData.id) {
            isCorrect = false;
            break;
        }
    }

    if (isCorrect) {
        startEndingSequence();
    } else {
        drawPatternLines(0xff0000);
        setTimeout(() => {
            userConnections = [];
            drawPatternLines();
        }, 800);
    }
}

// ★ 엔딩 연출 제어 스크립트
function startEndingSequence() {
    isEndingSequence = true;
    endingPhase = 1;
    endingTimer = 0;

    patternGraphics.visible = false;
    clearPatternDots();
    bookGuideText.visible = false;

    // X 버튼 최상단 고정 노출
    bookCloseText.visible = true;
    bookCloseText.zIndex = 420;

    endingFlashBg.alpha = 0;
    endingFlashBg.visible = true;

    // 중앙에서 퍼져나가는 은은한 입자 생성
    endingParticlesContainer.removeChildren();
    endingParticlesContainer.visible = true;
    endingParticles = [];

    for (let i = 0; i < 35; i++) {
        const p = new PIXI.Graphics();
        const color = [0xfff7a3, 0xffffff, 0xffd1dc, 0xc1e1c1][Math.floor(Math.random() * 4)];
        p.beginFill(color);
        p.drawCircle(0, 0, Math.random() * 6 + 3);
        p.endFill();

        p.x = VIEW_WIDTH / 2 + (Math.random() - 0.5) * 200;
        p.y = VIEW_HEIGHT / 2 + (Math.random() - 0.5) * 200;
        p.vx = (Math.random() - 0.5) * 4;
        p.vy = (Math.random() - 0.5) * 4;
        p.alpha = 0;

        endingParticlesContainer.addChild(p);
        endingParticles.push(p);
    }
}

function updateEndingSequence() {
    if (!isEndingSequence) return;

    endingTimer++;

    if (endingPhase === 1) {
        // Phase 1: 빛 반짝임 및 번쩍이는 섬광 (약 1.5초)
        endingParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha = Math.min(1, p.alpha + 0.06);
        });

        if (endingTimer < 50) {
            endingFlashBg.alpha = (endingTimer / 50) * 0.4;
        } else if (endingTimer < 80) {
            endingFlashBg.alpha = 0.4 + ((endingTimer - 50) / 30) * 0.6;
        } else {
            // Phase 2 전환: good.PNG 등장
            endingPhase = 2;
            endingTimer = 0;

            bookPageSprite.visible = false;

            goodPageSprite.alpha = 0;
            goodPageSprite.visible = true;
            goodPageSprite.scale.set(BOOK_PAGE_HEIGHT / loadedTextures.goodPage.height);

            endingHaloGraphics.visible = true;
        }
    } else if (endingPhase === 2) {
        // Phase 2: 페이드인 + 제자리에서 번쩍이는 후광 (5초 지속)
        if (goodPageSprite.alpha < 1) {
            goodPageSprite.alpha += 0.03;
        }
        if (endingFlashBg.alpha > 0) {
            endingFlashBg.alpha -= 0.03;
        }

        endingParticles.forEach(p => {
            p.x += p.vx * 0.8;
            p.y += p.vy * 0.8;
            p.alpha -= 0.008;
        });

        // 5초(300 프레임) 동안 제자리 펄스 효과, 이후 스르륵 숨김
        if (endingTimer <= 300) {
            drawPulsingHalo(endingTimer);
        } else {
            // 5초가 지나면 후광만 자연스럽게 지워짐
            endingHaloGraphics.alpha -= 0.02;
            if (endingHaloGraphics.alpha <= 0) {
                endingHaloGraphics.visible = false;
            }
        }
    }
}

// ★ 제자리에서 번쩍이는 은은한 후광 연출 (회전하지 않고 알파/크기만 조율)
function drawPulsingHalo(timer) {
    endingHaloGraphics.clear();
    endingHaloGraphics.alpha = 1;

    const centerX = VIEW_WIDTH / 2;
    const centerY = VIEW_HEIGHT / 2;
    const rayCount = 12;
    const maxRadius = Math.max(VIEW_WIDTH, VIEW_HEIGHT) * 0.8;

    // 사인파를 이용한 번쩍이는 알몸 조율 (펄스 주기)
    const pulseAlpha = 0.15 + Math.sin(timer * 0.1) * 0.1; 

    for (let i = 0; i < rayCount; i++) {
        const angle1 = (i / rayCount) * Math.PI * 2;
        const angle2 = ((i + 0.4) / rayCount) * Math.PI * 2;

        endingHaloGraphics.beginFill(0xfff7d6, pulseAlpha);
        endingHaloGraphics.moveTo(centerX, centerY);
        endingHaloGraphics.lineTo(centerX + Math.cos(angle1) * maxRadius, centerY + Math.sin(angle1) * maxRadius);
        endingHaloGraphics.lineTo(centerX + Math.cos(angle2) * maxRadius, centerY + Math.sin(angle2) * maxRadius);
        endingHaloGraphics.closePath();
        endingHaloGraphics.endFill();
    }
}

function closeBook() {
    bookActive = false;
    isEndingSequence = false;
    endingPhase = 0;

    if (endingFlashBg) endingFlashBg.visible = false;
    if (endingHaloGraphics) endingHaloGraphics.visible = false;
    if (endingParticlesContainer) endingParticlesContainer.visible = false;

    bookOverlay.visible = false;
    bookPageSprite.visible = false;
    bookCloseText.visible = false;
    bookGuideText.visible = false;
    patternGraphics.visible = false;
    if (goodPageSprite) goodPageSprite.visible = false;

    clearPatternDots();
    userConnections = [];
}

function updateBookIcon() {
    if (!bookIconSprite) return;
    bookIconSprite.visible = !inDialogue && !minigameActive && !bondEffectActive && !bookActive;
}

function init() {
    setupKeyboard();
    createDialogueUI();
    app.ticker.add(update);

   function resizeToFit() {
    const scale = Math.min(
        window.innerWidth / DESIGN_WIDTH,
        window.innerHeight / DESIGN_HEIGHT
    );

    app.view.style.width = `${DESIGN_WIDTH * scale}px`;
    app.view.style.height = `${DESIGN_HEIGHT * scale}px`;
    app.view.style.position = 'absolute';
    app.view.style.left = '50%';
    app.view.style.top = '50%';
    app.view.style.transform = 'translate(-50%, -50%)';
}

window.addEventListener('resize', resizeToFit);
resizeToFit();
}

function update(delta) {
    updateCharacter(delta);
    updateCamera();
    updateInteractionPrompts();
    updateThornFade();
    updateRewardFade();
    updateIdleHint();
    updateBondEffect();
    updateBookIcon();
    updateEndingSequence();
}

const dialogues = {
    npc1: {
        start: {
            speaker: '쿠치쿠치',
            text: '으,, 꼬마야 나 좀 도와줄 수 있니. 크게 다친건 아닌데 지금 몸에 힘이 안들어가네.',
            next: 'line2'
        },

        line2: {
            speaker: '쿠치쿠치',
            text: `내 가방에 <span style=\"color:#05AFF2;\"> 'om </span> 열매가 있어. 그것 좀 줄 수 있겠니?`,
            options: [
                { text: '자주색 약을 준다', next: 'red' },
                { text: '파란색 약을 준다', next: 'blue' }
            ]
        },

        red: {
            speaker: '쿠치쿠치',
            text: '고맙구나 꼬마야,, 한결 낫구나,,,',
            options: [
                { text: '별말씀을요.', next: 'reward' }
            ]
        },
        blue: {
            speaker: '쿠치쿠치',
            text: '이건 파란색 열매잖아! 이건 식용이 아니라 분장용이라구,,',
            options: [
                { text: '앗, 이 색이 아니었나봐! 다시 해석해보자', next: null }
            ]
        },
        reward: {
            speaker: '쿠치쿠치',
            text: '보답으로 이걸 주마',
            image: 'fruit',
            options: [
                { text: '감사합니다!', next: null }
            ]
        },
    },

    tull: {
        start: {
            speaker: '툴',
            text: "으 <span style=\"color:#05AFF2;\">'ak,,, 'ak,,,</span>",
            options: [
                { text: '뭐라고 하는걸까?', next: 'choice' }
            ]
        },

        choice: {
            by: 'player',
            speaker: '주인공',
            text: '어떻게 할까?',
            options: [
                { text:"<span style=\"color:#05AFF2;\">srung sivi oe? </span>", next: 'okay' },
                { text:"<span style=\"color:#05AFF2;\">irayo!</span>", next: 'ing' }
            ]
        },

        okay: {
            speaker: '툴',
            text: '응,,, 머리에 가시좀 빼줄 수 있어? 너무 아파,,',
            next: 'line3'
        },

        ing: {
            speaker: '툴',
            text: '아파하는데 고맙다고? 이 인간 이상하네!',
            next: null
        },

        line3: {
            by: 'player',
            speaker: '주인공',
            text: '나한테 맡겨!',
            next: 'thornGame'
        },

        thornGame: {
            type: 'minigame',
            next: 'afterThorn'
        },

        afterThorn: {
            speaker: '툴',
            text: '다행이다,,, 이제 안 아파! 고마워.',
            next: 'wind'
        },

        wind: {
            speaker:'툴',
            text: `보답으로 이거 줄게`,
            image: 'leaf',
            options: [
                {text:" <span style=\"color:#05AFF2;\"> rìk? </span>", next: '나뭇잎'},
                {text:" <span style=\"color:#05AFF2;\"> rìn? </span>", next:'나무'}
            ]
        },

        나뭇잎: {
            speaker:'툴',
            text: '맞아, 옆바다에서 주웠는데 귀여운 그림이 그려져 있어. 선물이야!',
            options: [
                { text: '고마워! 바람모양이 그려져있네!', next: null }
            ]
        },

        나무: {
            speaker:'툴',
            text:`이건 나무가 아니라 나뭇잎이긴한데, 옆바다에서 주웠는데 귀여운 그림이 그려져 있어. 선물이야! `,
            options: [
                { text: '고마워! 바람모양이 그려져있네!', next: null }
            ]
        }
    },

    wolf: {
        start: {
            speaker: '늑대',
            text: '으르렁,,',
            next: '인사',
        },

        인사: {
            by: 'player',
            speaker: '주인공',
            text:" <span style=\"color:#05AFF2;\"> kaltxì! </span>",
            next: '응',
        },

        응: {
            speaker:'늑대',
            text:`응? 안녕 말이 통하네`,
            options: [
                { text: '나비어를 공부하고 있거든요', next: '대단' }
            ]
        },

        대단: {
            speaker:'늑대',
            text:'대단한걸?',
            options: [
                {text: "<span style=\"color:#05AFF2;\">Lì’fyari oeyä Na’vi peyì?</span>", next: '화남' },
            ]
        },
        화남: {
            speaker:'늑대',
            text:'인사밖에 안 했으면서 어떻게 판단하라는 거냐! 내가 문제를 낼 테니까 맞혀보렴',
            options: [
                { text: '네,,', next: '문제' }
            ]
        },

        문제: {
            speaker: '늑대',
            text: '밤하늘에 떠 있어서 세상을 밝혀주는 존재를 뭐라고 하지?',
            options: [
                {text:" <span style=\"color:#05AFF2;\"> oare </span>", next: '달'},
                {text:" <span style=\"color:#05AFF2;\"> ontu </span>", next:'코'}
            ]
        },

        달: {
            speaker: '늑대',
            text: '오 정답이야. 달은 항상 밤을 밝혀주는 고마운 존재지. 다음문제를 내마',
            next: '문제2'
        },

        코: {
            speaker: '늑대',
            text: '코,,? 발음은 비슷했지만 아니다. 정답은 달 이다. 다음 문제를 내마',
            next: '문제3'
        },

        문제2: {
            speaker: '늑대',
            text: '내 사랑스러운 아기의 성별은 무엇일까?',
            next: '문제2_주인공'
        },

        문제3: {
            speaker: '늑대',
            text: '내 사랑스러운 아기의 성별은 무엇일까?',
            next: '문제3_주인공'
        },

        문제2_주인공: {
            by: 'player',
            speaker: '주인공',
            text: '그걸 제가 어떻게 알아요!',
            options: [
                { text: `<span style=\"color:#05AFF2;\">'itan</span>`, next: '하하' },
                { text: `<span style=\"color:#05AFF2;\">'ite</span>`, next: '하하' }
            ]
        },

        문제3_주인공: {
            by: 'player',
            speaker: '주인공',
            text: '그걸 제가 어떻게 알아요!',
            options: [
                { text: `<span style=\"color:#05AFF2;\">'itan</span>`, next: '하하' },
                { text: `<span style=\"color:#05AFF2;\">'ite</span>`, next: '하하3' }
            ]
        },

        하하: {
            speaker: '늑대',
            text: '하하, 정답은 없다, 우리는 성체가 되면 성별이 정해지거든, 그냥 너가 아들과 딸이라는 단어를 알고 있는지 궁금해서 그랬어',
            next: '대단한걸'
        },

        하하3: {
            speaker: '늑대',
            text: '하하, 정답은 없다, 우리는 성체가 되면 성별이 정해지거든, 그냥 너가 아들과 딸이라는 단어를 알고 있는지 궁금해서 그랬어',
            next: '대단한걸3'
        },

        대단한걸: {
            speaker:'늑대',
            text: '그나저나 대단하네 두 문제 모두 맞히다니 인정하마!',
            next: '교감',
        },

        대단한걸3: {
            speaker:'늑대',
            text: '흠, 한 문제밖에 맞히지 못했지만, 그래도 인정하마!',
            next: '교감',
        },

        교감: {
            speaker: '늑대',
            text: '보답으로 나와 교감할 기회를 주마! 자, 내 몸에 손을 올려 보거라',
            options: [
                { text: '손을 올린다', next: '교감효과' },
            ]
        },

        교감효과: {
            type: 'effect',
            next: '교감완료'
        },

       교감완료: {
            by: 'player',
            speaker: '주인공',
            text: '헉! 신기한 경험이었어,,,',
            next: '이별'
        },

        이별: {
            speaker:'늑대',
            text: '하하하, 좋은 경험이었길 바란다. 다음에 또 대화하자고!',
            next: null
        }
    },

    dragon: {
        start: {
            speaker: '드래곤',
            text: '지루해! 지루해!',
            next: 'line2'
        },
        line2: {
            by: 'player',
            speaker: '주인공',
            text: '응? 저건 용?',
            next: 'line3'
        },
        line3: {
            speaker: '드래곤',
            text: '오! 맛있어 보이는 거 발견!',
            next: 'line4'
        },
        line4: {
            by: 'player',
            speaker: '주인공',
            text: '으악! 난 먹는 게 아니야!',
            options: [
                { text: '나는 <span style=\"color:#05AFF2;\">ftxilor!</span>', next: 'delicious' },
                { text: `나는 <span style=\"color:#05AFF2;\">ftxivä'</span>`, next: 'notDelicious' },
            ]
        },

        notDelicious: {
            speaker: '드래곤',
            text: '맛없다고? 난 맛없는 게 싫어,, 저리가,,',
            next: null
        },

        delicious: {
            speaker: '드래곤',
            text: '맛있다고? 스스로를 맛있다고 하는 먹잇감은 처음인걸. 너 흥미롭네!',
            next: 'line6'
        },
        line6: {
            by: 'player',
            speaker: '주인공',
            text: '음,, 여기서 뭐하세요?',
            next: 'line7'
        },
        line7: {
            speaker: '드래곤',
            text: '보면 몰라? 할 게 없어서 빈둥대고 있잖아.',
            next: 'line8'
        },
        line8: {
            by: 'player',
            speaker: '주인공',
            text: '제가 놀아드릴까요?',
            next: 'line9'
        },
        line9: {
            speaker: '드래곤',
            text: '앙? 이몸을 만족시킬 수 있는 재밌는 놀이라도 알고 있는 거냐?',
            next: 'line10'
        },
        line10: {
            by: 'player',
            speaker: '주인공',
            text: '아마도 재밌을 거예요. 저희 세계에서 유명한 건데 가위바위보라고,,',
            next: 'line11'
        },
        line11: {
            by: 'player',
            speaker: '주인공',
            text: '(이러쿵저러쿵 규칙을 설명한다,,)',
            next: 'line12'
        },
        line12: {
            speaker: '드래곤',
            text: '오! 재밌게 들리네. 해보자고!',
            next: 'rockPaperScissors'
        },

        rockPaperScissors: {
            by: 'player',
            speaker: '주인공',
            text: '가위, 바위, 보!',
            options: [
                { text: '가위', next: 'win' },
                { text: '바위', next: 'lose' },
                { text: '보', next: 'win' }
            ]
        },

        win: {
            speaker: '드래곤',
            text: '음,, 져버렸군. 제법인걸?',
            next: 'afterGame'
        },
        lose: {
            speaker: '드래곤',
            text: '하하하 역시 나야!',
            next: 'afterGame'
        },

        afterGame: {
            speaker: '드래곤',
            text: '재밌는 시간이었어. 보답으로 선물을 주지.',
            next: 'wormReward'
        },
        wormReward: {
            by: 'player',
            speaker: '주인공',
            text: '으악, 대왕지렁이?',
            image: 'worm',
            next: 'wormDragon'
        },
        wormDragon: {
            speaker: '드래곤',
            text: '그래, 원래 내 저녁식사지만,, 너를 위해 주마.',
            next: 'wormPlayer'
        },
        wormPlayer: {
            by: 'player',
            speaker: '주인공',
            text: '음,, 감사합니다,,',
            next: null
        }
    }
};

function minDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

Promise.all([
    document.fonts.load('50px Dongle').then(() => document.fonts.ready),
    minDelay(150)   // 최소 150ms는 무조건 기다림 (저전력 상황 대비 여유)
]).then(() => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            loadGameAssets();
        });
    });
}).catch((err) => {
    console.error('폰트 로드 실패:', err);
    loadGameAssets();
});