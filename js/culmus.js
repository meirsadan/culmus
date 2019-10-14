
// Culmus.js 1.0.0

// (c) 2019 Meir Sadan
// This code may be freely distributed under the MIT license.
// For all details and documentation:
// http://github.com/meirsadan/culmus-js

// This script uses these libraries as dependencies:
// Opentype.js: for loading path data from font file
// Paper.js: for manipulating and rendering paths and graphics
// Tween.js: for the drawing animation

// Key codes for letter selection with keyboard
var keyCodeMap = {
    KeyA: 'ש',
    KeyB: 'נ',
    KeyC: 'ב',
    KeyD: 'ג',
    KeyE: 'ק',
    KeyF: 'כ',
    KeyG: 'ע',
    KeyH: 'י',
    KeyI: 'ן',
    KeyJ: 'ח',
    KeyK: 'ל',
    KeyL: 'ך',
    KeyM: 'צ',
    KeyN: 'מ',
    KeyO: 'ם',
    KeyP: 'פ',
    KeyR: 'ר',
    KeyS: 'ס',
    KeyT: 'א',
    KeyU: 'ו',
    KeyV: 'ה',
    KeyX: 'ס',
    KeyY: 'ט',
    KeyZ: 'ז',
    Period: 'ץ',
    Comma: 'ת',
    Semicolon: 'ף'
};

// Styles library - this empty variable will be assigned styles
// according to selected color theme (light/dark)
var styles = {};

// Style library for light color scheme
var lightStyles = {
    // Style instructions for main letter paths
    pathStyle: {
        fillColor: 'black',
        strokeColor: 'black',
        strokeWidth: 2,
        opacity: 0.7
    },
    // Style instructions for pen indicator
    penStyle: {
        strokeColor: 'red',
        strokeWidth: 5,
        opacity: 1
    },
    // Style instructions for pen angle label
    angleLabelStyle: {
        fillColor: 'red',
        fontFamily: 'Courier New',
        fontWeight: 'bold',
        fontSize: 8,
        opacity: 0.7
    },
    // Style instructions for background guidelines
    backgroundLineStyle: {
        strokeColor: '#aaddff'
    }
};

var darkStyles = {
    // Style instructions for main letter paths
    pathStyle: {
        fillColor: 'white',
        strokeColor: 'white',
        strokeWidth: 2,
        opacity: 0.7
    },
    // Style instructions for pen indicator
    penStyle: {
        strokeColor: '#f55b5b',
        strokeWidth: 5,
        opacity: 1
    },
    // Style instructions for pen angle label
    angleLabelStyle: {
        fillColor: '#f55b5b',
        fontFamily: 'Courier New',
        fontWeight: 'bold',
        fontSize: 8,
        opacity: 0.7
    },
    // Style instructions for background guidelines
    backgroundLineStyle: {
        strokeColor: '#425070'
    }
};

// Stroke Class
// Analyzes and draws individual stroke paths (as outlines)
// and their interpolated drawing phases
class Stroke {
    // Constructor takes a given `path` object describing the entire stroke
    constructor( path ) {
        this.path = path;
        this.path.set( styles.pathStyle );
        // The `reverse` property indicates whether path phases
        // should be interpolated from the "beginning" (right-handed)
        // or their "end" (left-handed)
        this.reverse = false;
        this.calculatePaths();
    }
    // Reapplies styles to stroke path in case of color theme change
    reapplyStyles() {
        this.path.set( styles.pathStyle );
    }
    // Breaks down the path to two segments, to prepare for
    // interpolation of drawing phases
    calculatePaths() {
        // Copy the entire original path to a new path object
        this.incoming = new paper.Path( this.path.segments );
        // Remove the second half of path segments from path copy
        // and place them in new path object - this creates an
        // "incoming" path and "outgoing" path, which are the two
        // parallel outlines on either side of the stroke
        this.outgoing = new paper.Path( this.incoming.removeSegments( this.incoming.segments.length / 2 ) );
        // Keep a record of the stroke length (using the incoming 
        // path data for convenience)
        this.length = this.incoming.length;
    }
    // Creates an interpolated stroke path of the original
    // stroke, up to a specified length `phaseLength`
    // which is a value between 0 and stroke property `length`
    getPhase( phaseLength ) {
        // Calculate incoming and outgoing paths (TODO: make this more efficient)
        this.calculatePaths();
        // Create copies of incoming and outgoing paths, and reverse them
        // if phase needs to be drawn backwards
        var incoming = new paper.Path( this.reverse ? this.outgoing.segments : this.incoming.segments );
        var outgoing = new paper.Path( this.reverse ? this.incoming.segments : this.outgoing.segments );

        // Calculate outgoing phase length, as the `length` property for the stroke
        // is calculated according to the incoming path
        var outgoingPhaseLength = ( phaseLength / this.length ) * this.outgoing.length;
        // Define phase lengths for each path according to the `reverse` property
        var incomingPhaseLength = this.reverse ? outgoingPhaseLength : phaseLength;
        outgoingPhaseLength = this.reverse ? phaseLength : outgoingPhaseLength;

        // Cut incoming path at specified `phaseLength` and retain first part
        incoming.splitAt( incomingPhaseLength );
        // Cut outgoing path at specified `outgoingPhaseLength`,
        // inverted by total path length, and retain latter part
        outgoing = outgoing.splitAt( outgoing.length - outgoingPhaseLength );

        // If cut outgoing path has more segments than the cut incoming
        // path, remove a segment from beginning of outoging path to make them even
        while ( outgoing.segments.length > incoming.segments.length ) {
            outgoing.removeSegments( 0, 1 );
        }
        // If cut incoming path has more segments than the cut outgoing
        // path, remove a segment from end of incoming path to make them even
        while ( incoming.segments.length > outgoing.segments.length ) {
            incoming.removeSegments( incoming.segments.length - 1 );
        }

        // Remove last outgoing bezier handle from the cut incoming path segments
        // (to get a straight edge cut stroke)
        incoming.segments[ incoming.segments.length - 1 ].handleOut.set( 0, 0 );
        // Remove first incoming bezier handle from the cut outgoing path segments
        // (to get a straight edge cut stroke)
        outgoing.segments[ 0 ].handleIn.set( 0, 0 );
        
        // Join incoming and outgoing paths to create the full stroke path
        incoming.addSegments( outgoing.segments );
        // Close the path
        incoming.closed = true;
        // Apply path styles
        incoming.set( styles.pathStyle );

        return incoming;
    }
    // Creates an interpolated stroke path with pen indicator
    getPhaseWithPen( phaseLength ) {
        // Call getPhase() method to create the interpolated stroke path
        var phase = this.getPhase( phaseLength );
        // Get the middle segment index of the stroke path
        var phaseMiddle = Math.floor( phase.segments.length / 2 );
        // Draw "pen" by extracting the two middle anchor points in the stroke path
        // and apply pen style to them
        var pen = new paper.Path( Object.assign( {
            segments: [ 
                phase.segments[ phaseMiddle - 1 ], 
                phase.segments[ phaseMiddle ] 
            ] 
        }, styles.penStyle ) );
        // Calculate angle between the two points in the pen stroke
        var angle = Math.round( 120 + pen.segments[1].point.subtract( pen.segments[0].point ).angle );
        // If angle is reversed (>180) reverse it back
        if ( angle > 180 ) angle -= 180;
        // Create text label with angle and place it near the pen stroke
        var angleLabel = new paper.PointText( Object.assign( {
            point: pen.bounds.center.clone().add( 10, 0 ),
            content: angle + '°'
        }, styles.angleLabelStyle ) );
        // Create group object containing the three objects: stroke, pen and angle label
        var g = new paper.Group();
        g.addChild( phase );
        g.addChild( pen );
        g.addChild( angleLabel );
        return g;
    }
}

// Letter Class
// Draws letter and letter phases (can be also used for more than one letter)
class Letter {
    // Constructor takes a `font` object from opentype.js and
    // string `str` containing the required letter
    constructor( font, str ) {
        // Create array for letters' stroke objects
        this.strokes = [];
        // Create `length` property to calculate total length of strokes
        this.length = 0;
        // Create `reverse` property to indicate whether paths should be
        // drawn in reverse
        this.reverse = false;
        // Load path data from font via SVG method. The SVG path is rendered at point size 1000,
        // mainly for convenience as most fonts' em units are defined at 1000.
        // The Y position is at the ascender height of 750
        // TODO: Read this from the font object (currently the definitions in the font file are off)
        this.g = new paper.Item().importSVG( '<svg>' + font.getPath( str, 0, 750, 1000 ).toSVG() + '</svg>' );
        if ( this.g.firstChild.className == 'Path' ) {
            // If letter contains only a single path, add it to the `strokes` array
            this.addStroke( this.g.firstChild );
        } else {
            // If letter is made from a compound path, add its individual paths
            // to the `strokes` array
            this.g.firstChild.children.forEach( p => this.addStroke( p ) );
        }
    }
    // Create stroke object from path and add to array
    addStroke( path ) {
        var s = new Stroke( path );
        this.strokes.push( s );
        // Add new stroke length to the total length of the path
        this.length += s.length;
    }
    // Reapplies styles to stroke objects in case of color scheme change
    reapplyStyles() {
        this.strokes.forEach( s => s.reapplyStyles() );
    }
    // Centers the letter horizontally
    centerLetter() {
        this.g.position.x = window.innerWidth / 2;
    }
    // Reverses stroke objects for backward phase interpolation
    reversePaths() {
        // negate the `reverse` property
        this.reverse = !this.reverse;
        // Sync the `reverse` property value with all `strokes` objects
        this.strokes.forEach( s => s.reverse = this.reverse );
    }
    // Recalculates the overall length of the letter, required when
    // rescaling the letter
    calculateLength() {
        this.length = 0;
        this.strokes.forEach( s => {
            s.calculatePaths();
            this.length += s.length;
        } );
    }
    // Get phase of letter according to float `offset` from 0 to 1
    getPhase( offset ) {
        // Check boundaries of `offset` are between 0 and 1
        if ( offset < 0 ) offset = 0;
        if ( offset > 1 ) offset = 1;
        // Group object `g` to place all created strokes
        var g = new paper.Group(), 
            // Iterator `idx` through `strokes` array
            idx = 0, 
            // Alias `ss` for `strokes` array
            ss = this.strokes, 
            // Calculate `pl` phase length from `length` property
            pl = offset * this.length, 
            // Ongoing length `ol` variable for understanding where phase is during iteration
            ol = 0;
        // If `offset` is 0 return empty `g` object
        if ( !offset ) return g;
        // If `offset` is 1 add fully cloned `strokes` array to `g` object and return
        if ( offset == 1 ) {
            ss.forEach( stroke => g.addChild( stroke.path.clone() ) );
            return g;
        }
        // Iterate through `strokes` array
        while ( idx < ss.length ) {
            if ( pl < ol + ss[ idx ].length ) {
                // If requested phase length `pl` is shorter than current stroke length,
                // create phased stroke and add to `g`, then break loop
                g.addChild( ss[ idx ].getPhaseWithPen( pl - ol ) );
                break;
            } else {
                // If `pl` is longer or equal to current stroke length, clone the full
                // stroke and add to `g` object
                g.addChild( ss[ idx ].path.clone() );
            }
            // Add current stroke length to the ongoing stroke length
            ol += ss[ idx ].length;
            idx += 1;
        }
        return g;
    }
}

// Font Class
// Manages letter objects
class Font {
    // Constructor receives optional `options` modifier in case of different parameters
    constructor( options ) {
        Object.assign( this, {
            // Filename of font to load letter path data from
            src: "fonts/CalligrapherFont-Regular.otf",
            // List of letter strings to render
            letterList: [ 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ', 'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת' ],
            // Empty `letters` array to hold letter objects
            letters: [],
            // Indicator `currentLetter` of current letters' index
            currentLetter: 0,
            // Factor in which to scale all letters
            scaleFactor: 1,
            // Group object to contain all letter paths (for transformations)
            g: new paper.Group()
        }, options );
    }
    // Load font and call function `cb` when done
    load( cb ) {
        // Check if `opentype` library is included
        if ( !opentype ) return console.error( "Opentype.js is a hard dependency.");
        // Load font file from `src` property
        opentype.load( this.src, ( err, font ) => {
            if ( err ) {
                console.error( 'Font could not be loaded: ' + err );
            } else {
                this.font = font;
                // Iterate through letter list and create new Letter objects
                this.letterList.forEach( char => {
                    var letter = new Letter( font, char );
                    this.letters.push( letter );
                    // Add letter object to `g` object
                    this.g.addChild( letter.g );
                } );
                this.centerLetter();
                // Center all letters on window resize
                window.addEventListener( 'resize', () => this.centerLetter() );
                cb();
            }
        } );
        return this;
    }
    // Reapply object styles to all letters in case of color theme change
    reapplyStyles() {
        this.letters.forEach( l => l.reapplyStyles() );
    }
    // Center and scale all letters, used initially and in case of window resize
    centerLetter() {
        // Position parent `g` object at center of window
        this.g.position.set( window.innerWidth / 2, window.innerHeight / 2 );
        // Center each letter object horizontally
        this.letters.forEach( letter => letter.centerLetter() );
        // If window's innerHeight hasn't change from last scale, return
        if ( window.innerHeight / 1000 == this.scaleFactor ) return;
        // Calculate new factor of how much to scale by dividing the window height by the original
        // font size: 1000 pixels
        var newScaleFactor = window.innerHeight / 1000;
        // Change scaling by dividing new factor with previous `scaleFactor`
        this.g.scaling.set( newScaleFactor / this.scaleFactor, newScaleFactor / this.scaleFactor );
        // Update `scaleFactor` property with new value
        this.scaleFactor = newScaleFactor;
        // Recalculate path lengths
        this.letters.forEach( letter => letter.calculateLength() );
    }
    // Reverses all letters' paths for backward phase drawing
    reversePaths() {
        this.letters.forEach( l => l.reversePaths() );
    }
    // Selects next letter
    nextLetter() {
        this.currentLetter += 1;
        // If `currentLetter` is past the `letterList` length, go back to start
        if ( this.currentLetter == this.letterList.length ) {
            this.currentLetter = 0;
        }
    }
    // Selects previous letter
    previousLetter() {
        this.currentLetter -= 1;
        // If `currentLetter` is past the 0 index, go to last index of `letterList`
        if ( this.currentLetter < 0 ) {
            this.currentLetter = this.letterList.length - 1;
        }
    }
    // Sets current letter according to string `char`
    setCurrentLetter( char ) {
        // Find string `char` in `letterList`
        var idx = this.letterList.indexOf( char );
        if ( idx > -1 ) {
            this.currentLetter = idx;
        }
    }
    // Gets letter phase path of current letter
    getCurrentLetterPhase( offset ) {
        return this.letters[ this.currentLetter ].getPhase( offset );
    }

}

// Draws background with guidelines
function createBackground() {
    var bg;
    if ( 'background' in paper.project.layers ) {
        // If background layer exists, empty it
        bg = paper.project.layers.background;
        bg.removeChildren();
    } else {
        // If background layer doesn't exist, create it
        bg = new paper.Layer();
        // Name layer
        bg.name = 'background';
        // Insert layer at bottom
        paper.project.insertLayer( 0, bg );
    }
    // Create baseline guide and apply styles
    bg.addChild( new paper.Path.Line( Object.assign( {
        from: [ 0, window.innerHeight * 0.75 ],
        to: [ window.innerWidth, window.innerHeight * 0.75 ]
    }, styles.backgroundLineStyle ) ) );
    // Create middle line (x-height/shoulder height) guide and apply styles
    bg.addChild( new paper.Path.Line( Object.assign( {
        from: [ 0, window.innerHeight * 0.25 ],
        to: [ window.innerWidth, window.innerHeight * 0.25 ],
    }, styles.backgroundLineStyle ) ) );
    // Calculate angle vector for diagonal guides
    var anglevector = new paper.Point( {
        angle: -60,
        length: window.innerHeight * 0.58
    } );
    // Determine start point for diagonal guides
    // Start x location before position 0
    var anglepoint = new paper.Point( {
        x: -(window.innerWidth / 50 * 20),
        y: window.innerHeight * 0.75
    } );
    // Create 80 diagonal guides
    for ( var i = 0; i < 80; i++ ) {
        // Add diagonal guide
        bg.addChild( new paper.Path.Line( Object.assign( {
            from: anglepoint.clone(),
            to: anglepoint.clone().add( anglevector )
        }, styles.backgroundLineStyle ) ) );
        anglepoint.x += window.innerWidth / 50;
    }
    // Re-activate project letter layer when done
    paper.project.layers.letter.activate();
}

// General animation function, updates the TWEEN object responsible for drawing animations
function animate( time ) {
    requestAnimationFrame( animate );
    TWEEN.update( time );
}

// Start application once document fully loads
window.onload = function() {

    // Define HTML elements for interface
    var canvasEl = document.getElementById( 'calligrapherCanvas' );
    var letterLabelEl = document.getElementById( 'letterLabel' );
    var previousButtonEl = document.getElementById( 'previousButton' );
    var nextButtonEl = document.getElementById( 'nextButton' );
    var reverseButtonEl = document.getElementById( 'reverseButton' );
    var infoButtonEl = document.getElementById( 'infoButton' );
    var infoEl = document.getElementById( 'information' );

    // Start up paper.js
    paper.setup( "calligrapherCanvas" );
    // Cancel automatic insertion of new objects to canvas
    paper.settings.insertItems = false;
    // Name current layer the 'letter' layer
    paper.project.activeLayer.name = 'letter';

    // Detect color scheme and set styles accordingly
    var darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    styles = darkModeMediaQuery.matches ? darkStyles : lightStyles;

    // Draw background guides
    createBackground();
    // Redraw background guides when window resizes
    window.addEventListener( 'resize', createBackground );

    // Load font to `f` variable and afterwards execute the inline callback.
    // Using an arrow function helps retain the original function scope
    var f = new Font().load( () => {
        
            // Phase object for tweening the drawing animation
        var phase = { offset: 0 },
            // Indicates whether mouse button/touch is currently "on"
            down = false,
            // Timeout ID for pausing the animation
            t_o,
            // Indicates whether information window is shown or not
            infoActive = false;
            
        // Gets drawing animation duration for current letter
        var getDuration = () => {
            return f.letters[ f.currentLetter ].length * ( 1000 / window.innerHeight ) * 2;
        };

        // Handler function for mouse/touch "on" event
        var ondown = () => {
            // Clears pausing timeout, if any
            clearTimeout( t_o );
            // Indicate that we are now in "down" mode
            down = true;
        };

        // Handler function for mouse/touch "off" event
        var onup = () => {
            // Clears pausing timeout, if any
            clearTimeout( t_o );
            // Indicates we are out of "down" mode
            down = false;
            // Reset tween animation to what's remaining of current phase offset
            tween.to( { offset: 1 }, getDuration() * ( 1 - phase.offset ) );
            // Set timeout to start animation in 500ms
            t_o = setTimeout( () => tween.start(), 500 );
        };

        // Handler function to redraw current letter phase
        var redrawPhase = () => {
            paper.project.layers.letter.removeChildren();
            f.centerLetter();
            paper.project.layers.letter.addChild( f.getCurrentLetterPhase( phase.offset ) ); 
        };

        var restartTween = () => {
            // Reset letter drawing phase offset
            phase.offset = 0;
            // Restart tween animation
            tween.to( { offset: 1 }, getDuration() ).start();
            // Update letter label
            letterLabelEl.innerText = f.letterList[ f.currentLetter ];
        };

        // Set up tween animation
        var tween = new TWEEN.Tween( phase )
            .to( { offset: 1 }, getDuration() )
            .onUpdate( () => redrawPhase() )
            .start();
            
        // Set up letter label
        letterLabelEl.innerText = f.letterList[ f.currentLetter ];

        // Start animation
        requestAnimationFrame( animate );

        // Listen to changes in color scheme
        darkModeMediaQuery.addListener((e) => {
            // Redefine styles in case of color scheme change and redraw/restyle elements
            styles = e.matches ? darkStyles : lightStyles;
            createBackground();
            f.reapplyStyles();
            redrawPhase();
        });

        // Listen to mouse events
        canvasEl.addEventListener( 'mousedown', ondown );
        canvasEl.addEventListener( 'mouseup', onup );
        // Handler for mouse move event – stop animation and change offset according to mouse position
        canvasEl.addEventListener( 'mousemove', e => {
            if ( !down ) return;
            tween.stop();
            phase.offset = ( ( e.clientX / window.innerWidth ) * 1.5 ) - 0.25;
            redrawPhase();
        } );

        // Listen to touch events
        canvasEl.addEventListener( 'touchstart', ondown );
        canvasEl.addEventListener( 'touchend', onup );
        // Handler for touch move event – stop animation and change offset according to touch position
        canvasEl.addEventListener( 'touchmove', e => {
            tween.stop();
            phase.offset = ( ( e.touches[0].clientX / window.innerWidth ) * 1.5 ) - 0.25;
            redrawPhase();
        } );

        // Listen to clicks on Previous button
        previousButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            // Select previous letter in font
            f.previousLetter();
            // Restart tween animation
            restartTween();
        } );

        // Listen to clicks on Next button
        nextButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            // Select next letter in font
            f.nextLetter();
            // Restart tween animation
            restartTween();
        } );

        // Listen to clicks on Reverse writing direction button
        reverseButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            // Reverse paths in font
            f.reversePaths();
            // Change button class according to reverse state
            e.currentTarget.className = e.currentTarget.className == 'button reversed' ? 'button' : 'button reversed';
            // Restart tween animation
            restartTween();
        } );
        
        // Listen to clicks on information element
        infoEl.addEventListener( 'click', e => {
            // If active, close element
            if ( infoActive ) {
                infoActive = false;
                infoEl.className = '';    
            }
        } );

        // Listen to clicks on information button
        infoButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            // Toggle information element
            infoActive = !infoActive;
            infoEl.className = infoActive ? 'active' : '';
        }, true );

        // Listen to keyboard key event
        document.addEventListener( 'keydown', e => {
            if ( e.code in keyCodeMap ) {
                // If letter was pressed, set current letter
                f.setCurrentLetter( keyCodeMap[ e.code ] );
                // Restart tween animation
                restartTween();
            } else {
                switch ( e.code ) {
                    case 'ArrowLeft':
                        // If left arrow was pressed, select next letter
                        f.nextLetter();
                        // Restart tween animation
                        restartTween();
                        break;
                    case 'ArrowRight':
                        // If right arrow was pressed, select previous letter
                        f.previousLetter();
                        // Restart tween animation
                        restartTween();
                        break;                        
                }
            }
        } );

    } );

};