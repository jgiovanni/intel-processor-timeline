import * as PIXI from 'pixi.js';
import moment from 'moment';
import _ from 'underscore';
import { TweenMax, Linear } from 'gsap';

let timelineOffsetX = 100;
let timelineOffsetY = 200;
let intervalMultiplier = 5;

//Aliases
const Container = PIXI.Container,
  ParticleContainer = PIXI.particles.ParticleContainer,
  autoDetectRenderer = PIXI.autoDetectRenderer,
  loader = PIXI.loader,
  resources = PIXI.loader.resources,
  Sprite = PIXI.Sprite,
  graphics = PIXI.Graphics;

//Create the app
const app = window.app = new PIXI.Application({
  // view: canvas,
  width: window.innerWidth,
  height: window.innerHeight,
  antialias: true,
  forceCanvas: true,
  // transparent: true,
  // backgroundColor: 0xFFFFFF,
  autoResize: true,
  resolution: 1,
});

const Settings = window.Settings = {
  clockMin: 108000,
  clockMax: 5000000000,
  currentLine: null,
  currentProcessor: null,
  currentIndex: null,
  currentMetadata: {
    min: 0,
    max: 0,
    transistors: 0,
  },
  fontFamily: 'Exo 2',
  years: [],
  legendYears: [],
  releases: [],
  Background: new Container(),
  Timeline: new Container(),
  TimelineProcessors: new Container(),
  TimelineProcessorsOriginal: [],
  Processor: new Container(),
  ProcessorStatsLeft: new Container(),
  ProcessorStatsRight: new Container(),
  Overlay: new Container(),
};

const setupTimelineView = () => {
  const busWidths = ['4-bit', '8-bit', 'bit-slice', '16-bit', '32-bit', '64-bit'];

// Create timeline date range with markers (LegendYears)
  let roundedMaxYear = moment().year() % 5 !== 0 ? moment().year() + (5 - moment().year() % 5) : moment().year();
  for (let y = 1970; y <= roundedMaxYear; y++) {
    Settings.years.push(y);
    if (y % 5 === 0) Settings.legendYears.push(y);
  }
};

const setupProcessorView = () => {
  Settings.Processor.width = app.renderer.width - 100;
  Settings.Processor.height = app.renderer.height - timelineOffsetY;
  Settings.Processor.pivot.set(0,.5);
  Settings.Processor.position.set(50, 0);
  
  // Setup Inner Containers
  setupProcessorStatsView();
};

const setupProcessorStatsView = () => {
  Settings.ProcessorStatsLeft.removeChildren();
  Settings.ProcessorStatsRight.removeChildren();
  // set width
  Settings.ProcessorStatsLeft.width = app.renderer.width/2 - 150;
  Settings.ProcessorStatsRight.width = app.renderer.width/2 - 150;
  // set height
  // Settings.ProcessorStatsLeft.height = Settings.Processor.height;
  // Settings.ProcessorStatsRight.height = Settings.Processor.height;
  // pivot left container
  Settings.ProcessorStatsLeft.pivot.set(1, 0);
  // position containers
  Settings.ProcessorStatsLeft.position.set(50, 50);
  Settings.ProcessorStatsRight.position.set(app.renderer.width/2, 0);
  Settings.Processor.addChild(Settings.ProcessorStatsLeft, Settings.ProcessorStatsRight);
};

document.body.appendChild(app.view);
// Setup Timeline Container
setupTimelineView();
// Setup Processor Container
setupProcessorView();

PIXI.loaders.Resource.setExtensionLoadType('mp4', PIXI.loaders.Resource.LOAD_TYPE.VIDEO);
loader
  //  Processor data and images
  .add('processors', 'src/processors.json')
  .add('4004', 'src/assets/processors/4004.png')
  .add('4040', 'src/assets/processors/4040.png')
  .add('8008', 'src/assets/processors/8008.png')
  .add('8080', 'src/assets/processors/8080.png')
  .add('8085', 'src/assets/processors/8085.png')
  .add('8086', 'src/assets/processors/8086.png')
  .add('286', 'src/assets/processors/286.png')
  .add('386', 'src/assets/processors/386.png')
  .add('486', 'src/assets/processors/486.png')
  .add('Pentium', 'src/assets/processors/Pentium.png')
  .add('Pentium Pro', 'src/assets/processors/Pentium Pro.png')
  .add('Pentium II', 'src/assets/processors/Pentium II.png')
  .add('Pentium III', 'src/assets/processors/Pentium III.png')
  .add('Pentium Celeron', 'src/assets/processors/Pentium Celeron.png')
  .add('Pentium 4', 'src/assets/processors/Pentium 4.png')
  .add('Pentium M', 'src/assets/processors/Pentium M.png')
  .add('Core 2 Duo', 'src/assets/processors/Core 2 Duo.png')
  .add('Atom', 'src/assets/processors/Atom.png')
  .add('Core 2nd Gen', 'src/assets/processors/Core 2nd Gen.png')
  .add('Core 3rd Gen', 'src/assets/processors/Core 3rd Gen.png')
  .add('bgVideo', 'src/assets/Molecular_Plex_4K_Motion_Background_Loop.mp4')
  //
  .add('leftArrow', 'src/assets/arrow_left_white_24dp_2x.png')
  .add('rightArrow', 'src/assets/arrow_right_white_24dp_2x.png')
  .add('info', 'src/assets/info_white_24dp_2x.png')
  .add('about', 'src/assets/about.png')
  .add('share', 'src/assets/share_white_24dp_2x.png')
  .add('timelineBackground', 'src/assets/groovepaper.png')
  // Progress Loader
  .on("progress", loadProgressHandler)
  
  .load((loader, resources) => {
    createBackground(false);
  
    let style = {
      align: 'center',
      fontFamily: Settings.fontFamily,
      fontSize: 24,
      fill: 'white',
    };
    let title = new PIXI.Text('Timeline of Intel Processors', style);
    // title.anchor.set(.5);
    title.position.set(10, 10);
  
    const LeftArrow = new Sprite(resources.leftArrow.texture);
    LeftArrow.position.set(50, (app.renderer.height - timelineOffsetY) / 2);
    LeftArrow.anchor.set(.5);
    LeftArrow.interactive = true;
    LeftArrow.buttonMode = true;
    LeftArrow.on('tap', previousProcessor);
    LeftArrow.on('click', previousProcessor);
  
    const RightArrow = new Sprite(resources.rightArrow.texture);
    RightArrow.position.set(app.renderer.width - 50, (app.renderer.height - timelineOffsetY) / 2);
    RightArrow.anchor.set(.5);
    RightArrow.interactive = true;
    RightArrow.buttonMode = true;
    RightArrow.on('tap', nextProcessor);
    RightArrow.on('click', nextProcessor);
  
    createTimeline();
  
    let about = new Sprite(resources.about.texture);
    about.anchor.set(1, .5);
    about.scale.set(.5);
    about.position.set(app.renderer.width - 10, 20);
    about.interactive = true;
    about.buttonMode = true;
    about.on('mouseover', function (event) {
      event.target.tint = 0xDDDDDD;
    });
    about.on('mouseout', function (event) {
      event.currentTarget.tint = 0xFFFFFF;
    });
    about.on('click', aboutClick);
    about.on('tap', aboutClick);
  
    app.stage.addChild(Settings.Timeline);
    app.stage.addChild(Settings.Processor);
    app.stage.addChild(LeftArrow, RightArrow, about);
    // app.stage.addChild(title);
    app.stage.addChild(Settings.Overlay);
  
    // load first processor
    nextProcessor();
    app.ticker.add((delta) => {

    });
  
    console.log(Settings);
  });

function loadProgressHandler(loader, resource) {
  //Display the file `url` currently being loaded
  console.log("loading: " + resource.url);
  
  //Display the percentage of files currently loaded
  console.log("progress: " + loader.progress + "%");
  
  //If you gave your files names as the first argument
  //of the `add` method, you can access them like this
  //console.log("loading: " + resource.name);
  let style = {align: 'center', fontFamily: Settings.fontFamily, fontSize: 20, fill: 'white'};
  let lText = new PIXI.Text('Loading', style);
  let lTextProgress = new PIXI.Text(Math.round(loader.progress) + '%', _.extend(style, { fontSize: 25 }));
  lText.anchor.set(.5);
  lTextProgress.anchor.set(.5, 0);
  lText.position.set(app.renderer.width/2, app.renderer.height/2);
  lTextProgress.position.set(app.renderer.width/2, lText.y + 40);
  let min = app.renderer.width/2 - 200;
  let max = map_range(loader.progress, 0, 100, 0, 400);
  let speedBarUnder = new graphics().lineStyle(3, 0xFFFFFF, 1).beginFill(0x333333, 1).drawRoundedRect(0, 0, 402, 52, 10);
  let speedBar = new graphics().beginFill(0xFFFFFF).drawRoundedRect(0, 0, 400, 50, 10);
  let speedBarOverlay = new graphics().beginFill(0xFFFFFF, .5).drawRoundedRect(0, 0, max, 50, 10);
  let speedBarSprite = new Sprite(PIXI.Texture.fromCanvas(createGradient('#1073C2', '#FF9405', max, 50)));
  speedBarSprite.width = max;
  speedBarSprite.mask = speedBar;
  speedBar.position.set(min, lText.y + 30);
  speedBarOverlay.position.set(min, lText.y + 30);
  speedBarOverlay.blendMode = 4;
  speedBarSprite.position.set(min, lText.y + 30);
  speedBarUnder.position.set(min-1, lText.y + 30-1);
  speedBar.cacheAsBitmap = true;
  speedBarUnder.cacheAsBitmap = true;
  app.stage.addChild(lText, speedBarUnder, speedBarSprite, speedBar, speedBarOverlay, lTextProgress);
  
}

const createTimeline = () => {
  let timelineWidth = app.renderer.width - timelineOffsetX;
  let timleineTop = app.renderer.height - timelineOffsetY;
  let timelineIntervals = Settings.legendYears.length * intervalMultiplier;
  let timelineDotInterval = timelineWidth / timelineIntervals;
  let timelineBase = app.renderer.height - 25;
  // populate releases array for timeline
  _.each(resources.processors.data.processors, (p) => { Settings.releases.push(_.pick(p, 'id', 'name', 'bus_width', 'release_date', 'mips')) });
  // Create Settings.Timeline Stage
  // Create Settings.Timeline Elements
  // Generate Years texts
  let dateStyle = {
    align: 'center',
    fontFamily: Settings.fontFamily,
    fontSize: 16,
    fill: 'black',
  };
  for (let y in Settings.legendYears) {
    // determine if year is important to be placed on the timeline
    let text = new PIXI.Text(Settings.legendYears[y], dateStyle);
    text.anchor.set(.5);
    text.position.set(timelineWidth * (y / Settings.legendYears.length), timelineBase);
    Settings.Timeline.addChild(text)
  }
  // Lines
  let topLine = new graphics();
  topLine.lineStyle(5, 0x000000, .33);
  topLine.moveTo(-100, timleineTop);
  topLine.lineTo(app.renderer.width, timleineTop);
  topLine.pivot.set(.5);
  topLine.cacheAsBitmap = true;
  
  let bottomLine = new graphics();
  bottomLine.lineStyle(3, 0x000000, .13);
  bottomLine.moveTo(-100, timelineBase - 25);
  bottomLine.lineTo(app.renderer.width, timelineBase - 25);
  bottomLine.pivot.set(.5);
  bottomLine.cacheAsBitmap = true;
  
  Settings.currentLine = new graphics();
  Settings.currentLine.lineStyle(2, 0x000000, .23);
  Settings.currentLine.moveTo(0, timleineTop);
  Settings.currentLine.lineTo(0, timelineBase - 25);
  Settings.currentLine.pivot.set(.5);
  Settings.currentLine.cacheAsBitmap = true;
  
  Settings.Timeline.addChild(Settings.currentLine, topLine, bottomLine);
  
  // Year markers
  for (let p = 0; p < timelineIntervals - intervalMultiplier + 1; p++) {
    // create major + minor year markers
    let dot = new graphics(false);
    dot.pivot.set(.5);
    if (p % 5 === 0) {
      dot.beginFill(0x666666);
      dot.drawCircle(0, 0, 5);
    } else {
      dot.beginFill(0x666666  );
      dot.drawCircle(0, 0, 3);
    }
    dot.position.set(timelineDotInterval * p, timelineBase - 25);
    // dot.cacheAsBitmap = true;
    Settings.Timeline.addChild(dot);
    
    let processors = _.where(Settings.releases, { release_date: Settings.years[p] });
    _.each(processors, (processor, index) => {
      let pDot = new graphics();
      pDot.pivot.set(.5);
      let heightOffset = map_range(processor.mips, 0, 250000, 40, timelineOffsetY - 50);
      switch (processor.bus_width) {
        case '4-bit': pDot.beginFill(0x000000); break;
        case '8-bit': pDot.beginFill(0xE2C100);  break;
        case '16-bit': pDot.beginFill(0xB50066); break;
        case '32-bit': pDot.beginFill(0x8CD200); break;
        case '64-bit': pDot.beginFill(0x370C9A); break;
      }
      pDot.drawCircle(0, 0, 3);
      pDot.position.set(timelineDotInterval * p + (index * 10), timelineBase - heightOffset);
      pDot.interactive = true;
      pDot.interactiveChildren = false;
      // pDot.cacheAsBitmap = true;
      pDot.meta = processor;
      pDot.on('mouseover', timelineObjectMouseOver);
      pDot.on('mouseout', timelineObjectMouseOut);
      pDot.on('tap', timelineObjectClicked);
      pDot.on('click', timelineObjectClicked);
      Settings.TimelineProcessors.addChild(pDot);
      Settings.TimelineProcessorsOriginal.push(pDot);
    })
  }
  Settings.Timeline.addChild(Settings.TimelineProcessors);
  Settings.Timeline.x = timelineOffsetX;
};

const createBackground = (disableVideo = false) => {
  if (!disableVideo) {
    resources.bgVideo.data.loop = true;
    resources.bgVideo.data.preload = "auto";
    // debugger;
    const Background = new Sprite(PIXI.Texture.fromVideo(resources.bgVideo.data));
    Background.position.set(app.renderer.width / 2, app.renderer.height / 2);
    // Background.width = resources.bgVideo.data.videoWidth * (app.renderer.height / resources.bgVideo.data.videoHeight);
    // Background.height = app.renderer.height;
    Background.width = app.renderer.width;
    Background.height = resources.bgVideo.data.videoheight * (resources.bgVideo.data.videoWidth / app.renderer.width);
    Background.anchor.set(.5);
  
    const glass = window.glass = new graphics();
    glass.beginFill(0x000000, .33);
    glass.drawRect(0, 0, app.renderer.width, app.renderer.height);
    glass.blendMode = 4;
    // glass.cacheAsBitmap = true;
    app.stage.addChild(Background);
    app.stage.addChild(glass);
  }
  // Settings.Timeline Background
  let tlBg = new PIXI.extras.TilingSprite(resources.timelineBackground.texture, app.renderer.width, 300);
  tlBg.position.set(0, app.renderer.height - timelineOffsetY);
  tlBg.cacheAsBitmap = true;
  /*let bgRect = new graphics().beginFill(0xFFFFFF).drawRect(0, app.renderer.height - 125.5, app.renderer.width, 300);
  bgRect.cacheAsBitmap = true;*/

  // app.stage.addChild(bgRect);
  app.stage.addChild(tlBg);
  
};


// Interaction Functions
const aboutClick = (event) => {
  if (!Settings.showAbout) {
    Settings.showAbout = true;
    event.target.tint = 0x1073C2;
  
    let style = {
      align: 'center',
      fontFamily: Settings.fontFamily,
      fontSize: 20,
      fill: 'white',
      wordWrap: true,
      wordWrapWidth: 400
    };
    let info = new PIXI.Text('Created by: Jerez Bain\nWebsite: http://gorigins.com\n\nCredits:\nBackground video: Videezy @ http://www.Videezy.com', style);
    // info.width = style.wordWrapWidth;
    info.position.set(5, 5);
  
    Settings.showAbout = new graphics().beginFill(0x000000, .9).drawRoundedRect(0, 0, style.wordWrapWidth, info.height + 10, 10);
    Settings.showAbout.pivot.set(.5);
    Settings.showAbout.position.set(app.renderer.width / 4, app.renderer.height / 4);
    Settings.showAbout.cacheAsBitmap = true;
    Settings.Overlay.addChild(Settings.showAbout);
    Settings.showAbout.addChild(info);
  } else {
    event.target.tint = 0xFFFFFF;
    Settings.Overlay.removeChild(Settings.showAbout);
    Settings.showAbout = null
  }
};
const timelineObjectMouseOver = (event) => {
  // console.log(event.target.meta);
  // Create Tooltip
  let style = { align: 'left', fontFamily: Settings.fontFamily, fontSize: 12, fill: 'white'};
  let text = new PIXI.Text(`Intel ${event.currentTarget.meta.name}\n${event.currentTarget.meta.bus_width} Processor\nReleased ${event.currentTarget.meta.release_date}`, style);
  
  let container = new graphics().beginFill(0x000000, .66).drawRoundedRect(0, 0, 150, text.height + 10, 10);
  container.pivot.set(.5, 1);
  container.position.set(event.target.x + 25, event.target.y - 75);
  container.cacheAsBitmap = true;
  Settings.Overlay.addChild(container);
  
  text.position.set(10, 5);
  container.addChild(text)
};
const timelineObjectMouseOut = (event) => {
  Settings.Overlay.removeChildren();
};
const timelineObjectClicked = (event) => {
  let processor = _.findWhere(resources.processors.data.processors, { name: event.target.meta.name });
  if (Settings.currentProcessor && processor.name === Settings.currentProcessor.name) return;
  
  // Clear container
  TweenMax.killAll(true);
  TweenMax.to(Settings.currentLine.position, .2, { x: event.target.x });
  Settings.Processor.removeChildren();
  // add sub-containers back
  // set current states
  let found = _.find(Settings.TimelineProcessors.children, (child) => child.meta.current === true);
  if (found) found.current = false;
  event.target.meta.current = true;
  if (event.target.scale) {
    TweenMax.to(event.target, .33, {width: 15, height: 15, repeat: -1, yoyo: true});
  } else {
    for(let i in Settings.TimelineProcessors.children) {
      if (Settings.TimelineProcessors.children[i].current) {
        TweenMax.to(Settings.TimelineProcessors.children[i], .33, {width: 15, height: 15, repeat: -1, yoyo: true});
      }
    }
    
  }
  Settings.currentProcessor = processor;
  
  setupProcessorStatsView();
  
  /* Processor Stats Left Container*/
  const ContainerWidth = app.renderer.width/2 - 100;
  const ContainerHeight = app.renderer.height - timelineOffsetY - 50;
  // Set Name
  let name = new PIXI.Text(`Intel ${processor.name}`, { align: 'left', fontFamily: Settings.fontFamily, fontSize: 50, fill: 'white', dropShadow: true, dropShadowDistance: 1, wordWrap: true, wordWrapWidth: ContainerWidth});
  let style = { align: 'left', fontFamily: Settings.fontFamily, fontSize: 18, fill: 'white', dropShadow: true, dropShadowDistance: 1 };
  let busWidth = new PIXI.Text(event.target.meta.bus_width + ' Processor', style);
  let release = new PIXI.Text('Released ' + event.target.meta.release_date, style);
  name.position.set(0, 0);
  busWidth.position.set(0, name.y + name.height);
  release.position.set(0, busWidth.y + busWidth.height);
  Settings.ProcessorStatsLeft.addChild(name, busWidth, release);

// Set Image
  let image = new Sprite(resources[processor.name] ? resources[processor.name].texture : PIXI.Texture.fromImage(processor.image), true);
  image.scale.set(.3);
  image.anchor.set(.5);
  image.position.set(ContainerWidth/2, ContainerHeight * 2/3);
  
  let imgRect1 = new graphics().beginFill(0xFFFFFF, .5).drawRect(0, 0, 200, 200);
  let imgRect2 = new graphics().beginFill(0xFFFFFF, .5).drawRect(0, 0, 200, 200);
  let imgRect3 = new graphics().beginFill(0xFFFFFF, .5).drawRect(0, 0, 200, 200);
  // window.imgRect2 = imgRect2
  imgRect1.pivot.set(.5);
  imgRect2.pivot.set(.5);
  imgRect3.pivot.set(.5);
  imgRect1.skew.set(15 * PIXI.DEG_TO_RAD);
  imgRect2.skew.set(15 * PIXI.DEG_TO_RAD);
  imgRect3.skew.set(15 * PIXI.DEG_TO_RAD);
  imgRect1.rotation = -45 * PIXI.DEG_TO_RAD;
  imgRect2.rotation = 15 * PIXI.DEG_TO_RAD;
  imgRect3.rotation = 75 * PIXI.DEG_TO_RAD;
  imgRect1.position.set(ContainerWidth/2 - 175, image.y + 100);
  imgRect2.position.set(ContainerWidth/2 + 5, image.y - 215);
  imgRect3.position.set(ContainerWidth/2 - 10, image.y - 215);
  imgRect1.blendMode = 4;
  imgRect2.blendMode = 4;
  imgRect3.blendMode = 4;
  
  Settings.ProcessorStatsLeft.addChild(imgRect1, imgRect2, imgRect3);
  Settings.ProcessorStatsLeft.addChild(image);
  
  /* Processor Stats Right Container*/
  // Stats background
  let StatsBG = new graphics()
    .beginFill(0xFFFFFF, .25).drawRoundedRect(0, 0, app.renderer.width/2 - 150, app.renderer.height - timelineOffsetY * 2, 10);
  StatsBG.pivot.set(0, 1);
  StatsBG.position.set(0, 50);
  // Settings.ProcessorStatsRight.addChild(StatsBG); // Will be used as a container for content
  
  // Set Stats
  let statsLabelStyle = {
    align: 'left',
    fontFamily: Settings.fontFamily,
    fontSize: 18,
    fill: 'white',
    dropShadow: true,
    dropShadowDistance: 1,
    wordWrap: true,
    wordWrapWidth: ContainerWidth
  };
  // Clock Speed text
  let speedLabel = new PIXI.Text('Clock Speed: Min. (Left) & Max (Right)', statsLabelStyle);
  speedLabel.position.set(10, 60);
  let speedToolTip = createTooltip(ContainerWidth, 'The internal heartbeat of a computer, also known as "clock rate." The clock circuit uses fixed vibrations generated from a quartz crystal to deliver a steady stream of pulses to the CPU.', 'left', 'bottom');
  speedToolTip.position.set(speedLabel.x + speedLabel.width + 15, speedLabel.y + speedLabel.height/2);
  Settings.ProcessorStatsRight.addChild(speedLabel, speedToolTip);
  
  // Clock Speed Bar
  let oldMin = map_range(Settings.currentMetadata.min , Settings.clockMin, Settings.clockMax, 5, ContainerWidth);
  let oldMax = map_range(Settings.currentMetadata.max, Settings.clockMin, Settings.clockMax, 5, ContainerWidth);
  let speedBar = new graphics().beginFill(0xFFFFFF).drawRoundedRect(0, 0, oldMax-oldMin, 50, 10);
  let speedBarOverlay = new graphics().beginFill(0xFFFFFF, .5).drawRoundedRect(0, 0, oldMax-oldMin, 50, 10);
  let speedBarSprite = new Sprite(PIXI.Texture.fromCanvas(createGradient('#1073C2', '#FF9405', ContainerWidth, 50)));

  speedBarSprite.width = ContainerWidth;
  speedBarSprite.mask = speedBar;
  
  speedBar.position.set(oldMin, 85);
  speedBarOverlay.position.set(oldMin, 85);
  speedBarSprite.position.set(0, 85);
  
  speedBarOverlay.blendMode = 4;
  speedBar.cacheAsBitmap = true;
  Settings.ProcessorStatsRight.addChild(speedBarSprite, speedBar, speedBarOverlay);
  
  let newMin = map_range(processor.clock_speeds.min.simple, Settings.clockMin, Settings.clockMax, 5, ContainerWidth);
  let newMax = map_range(processor.clock_speeds.max.simple, Settings.clockMin, Settings.clockMax, 5, ContainerWidth);
  // move bars
  TweenMax.to(speedBar.position, .33, { x: newMin });
  TweenMax.to(speedBarOverlay.position, .33, { x: newMin });
  // TweenMax.to(speedBarSprite.position, .33, { x: newMin });
  //
  TweenMax.to(speedBar, .33, { width: newMax-newMin, onComplete: () => {
      speedBar = new graphics().beginFill(0xFFFFFF).drawRoundedRect(0, 0, newMax-newMin, 50, 10);
      // speedBarSprite.mask = speedBar;
      speedBar.position.x = newMin;
      speedBar.cacheAsBitmap = true;
    }});
  TweenMax.to(speedBarOverlay, .33, { width: newMax-newMin});
  // TweenMax.to(speedBarSprite, .33, { width: newMax});
  
  // let range = map_range();
  // let performanceBar = new graphics().beginFill(0xFFFFFF).drawRoundedRect(0, 0, max, 50, 10);
  
  let speedLabelStyle = _.extend(_.clone(statsLabelStyle), { align: 'right' } );
  let minLabel = new PIXI.Text(`${processor.clock_speeds.min.value}${processor.clock_speeds.min.unit}`, speedLabelStyle);
  minLabel.position.set(speedBar.x - minLabel.width - 5, speedBar.y + speedBar.height/4);
  let maxLabel = new PIXI.Text(`${processor.clock_speeds.max.value}${processor.clock_speeds.max.unit}`, statsLabelStyle);
  maxLabel.position.set(speedBar.x + speedBar.width + 5, speedBar.y + speedBar.height/4);
  // move labels
  TweenMax.to(minLabel.position, .33, { x: newMin - minLabel.width - 5 });
  TweenMax.to(maxLabel.position, .33, { x: newMax + 5 });
  
  // update metadata
  Settings.currentMetadata.min = processor.clock_speeds.min.simple;
  Settings.currentMetadata.max = processor.clock_speeds.max.simple;
  Settings.ProcessorStatsRight.addChild(minLabel, maxLabel);
  
  // Transistors Text
  let transistorsLabel = new PIXI.Text('Transistors', statsLabelStyle);
  transistorsLabel.position.set(10, 160);
  let transistorToolTip = createTooltip(ContainerWidth, 'The transistor is the primary building block of all microchips, including your CPU, and is what creates the binary 0\'s and 1\'s (bits) your computer uses to communicate and deal with Boolean logic.');
  transistorToolTip.position.set(transistorsLabel.x + transistorsLabel.width + 15, transistorsLabel.y + transistorsLabel.height/2);
  Settings.ProcessorStatsRight.addChild(transistorsLabel, transistorToolTip);
  let transistorsCounter = new PIXI.Text(Settings.currentMetadata.transistors, { align: 'right', fontFamily: Settings.fontFamily, fontSize: 50, fill: 'white'});
  transistorsCounter.anchor.set(1, 0);
  TweenMax.to(transistorsCounter, 3, { text: processor.transistors, roundProps: 'text', ease:Linear.easeNone, onComplete: function () {
      transistorsCounter.text = Number(transistorsCounter.text).toLocaleString();
      Settings.currentMetadata.transistors = Number(_.isString(transistorsCounter.text) ? transistorsCounter.text.replace(/\,/g, '') : transistorsCounter.text);
    }});
  transistorsCounter.position.set(StatsBG.width - 10, 190);
  Settings.ProcessorStatsRight.addChild(transistorsCounter);
  
  // Manufacturing Tech Text
  let manTechLabel = new PIXI.Text('Manufacturing Technology', statsLabelStyle);
  manTechLabel.position.set(10, 250);
  let manTechToolTip = createTooltip(ContainerWidth, 'The physical size of the elements on a chip\'s design.');
  manTechToolTip.position.set(manTechLabel.x + manTechLabel.width + 15, manTechLabel.y + manTechLabel.height/2);
  Settings.ProcessorStatsRight.addChild(manTechLabel, manTechToolTip);
  
  let manTechText = new PIXI.Text(processor.manufacturing_technology, { align: 'right', fontFamily: Settings.fontFamily, fontSize: 50, fill: 'white'});
  manTechText.anchor.set(1, 0);
  manTechText.position.set(StatsBG.width - 10, 280);
  Settings.ProcessorStatsRight.addChild(manTechText);
  
  // Manufacturing Tech Text
  let triviaLabel = new PIXI.Text('History & Trivia', statsLabelStyle);
  triviaLabel.position.set(10, 350);
  let triviaToolTip = createTooltip(ContainerWidth, 'The physical size of the elements on a chip\'s design.');
  triviaToolTip.position.set(triviaLabel.x + triviaLabel.width + 15, triviaLabel.y + triviaLabel.height/2);
  Settings.ProcessorStatsRight.addChild(triviaLabel, triviaToolTip);
  
  let triviaText = new PIXI.Text(processor.trivia, { align: 'left', fontFamily: Settings.fontFamily, fontSize: 20, fill: 'white', wordWrap: true, wordWrapWidth: ContainerWidth});
  triviaText.position.set(10, 375);
  Settings.ProcessorStatsRight.addChild(triviaText);
  
};
const previousProcessor = (event) => {
  let currentIndex = Settings.currentProcessor
    ? _.findIndex(Settings.TimelineProcessors.children, (child) => child.meta.name === Settings.currentProcessor.name)
    : 0;
  let newIndex = currentIndex === 0 ? Settings.TimelineProcessors.children.length - 1 : currentIndex - 1;
  timelineObjectClicked({ target: Settings.TimelineProcessors.children[newIndex] })
};
const nextProcessor = (event) => {
  let currentIndex = Settings.currentProcessor
    ? _.findIndex(Settings.TimelineProcessors.children, (child) => child.meta.name === Settings.currentProcessor.name)
    : Settings.TimelineProcessors.children.length - 1;
  let newIndex = currentIndex === Settings.TimelineProcessors.children.length - 1 ? 0 : currentIndex + 1;
  timelineObjectClicked({ target: Settings.TimelineProcessors.children[newIndex] })
};

// Utility Functions
function createTooltip(width = 450, text, horizontal = 'center', vertical = 'top') {
  let animation;
  function showTip(event) {
    event.target.tint = 0x1073C2;
    animation = TweenMax.to(event.target.scale, .33, { x: .75, y: .75, repeat: -1, yoyo: true });
    let style = { align: 'center', fontFamily: Settings.fontFamily, fontSize: 16, fill: 'white', wordWrap: true, wordWrapWidth: width };
    let info = new PIXI.Text(text, style);
    info.position.set(5, 5);

    let container = new graphics().beginFill(0x000000, .9).drawRoundedRect(0, 0, style.wordWrapWidth + 10, info.height + 10, 10);
    container.pivot.set(.5, 1);
    
    switch (horizontal) {
      case 'left':
        container.position.x = event.target.getGlobalPosition().x - width;
        break;
      case 'right':
        container.position.x = event.target.getGlobalPosition().x;
        break;
      case 'center':
      default:
        container.position.x = event.target.getGlobalPosition().x - width/2;
        break;
    }
    
    switch (vertical) {
      case 'top':
      default:
        container.position.y =event.target.getGlobalPosition().y - info.height - 30;
        break;
      case 'bottom':
        container.position.y = event.target.getGlobalPosition().y + 30;
        break;
    }
    container.cacheAsBitmap = true;
    Settings.Overlay.addChild(container);
    
    container.addChild(info)
  }
  let sprite = new Sprite(resources.info.texture);
  sprite.anchor.set(.5);
  sprite.scale.set(.5);
  sprite.interactive = true;
  sprite.on('mouseover', showTip);
  sprite.on('mouseout', function() { this.tint = 0xFFFFFF; animation.pause().seek(0); Settings.Overlay.removeChildren() });
  return sprite;
}
function createGradient(color1, color2, width = 200, height = 60) {
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  let gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

function map_range(value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

// resize event
window.onresize = (event) => {
  let w = window.innerWidth;
  let h = window.innerHeight;    //this part resizes the canvas but keeps ratio the same
  app.view.style.width = w + "px";
  app.view.style.height = h + "px";
  //this part adjusts the ratio:
  app.renderer.resize(w,h);
  
  
};