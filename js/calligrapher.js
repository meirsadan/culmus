
var styles = {};

var positiveStyles = {
    pathStyle: {
        fillColor: 'black',
        strokeColor: 'black',
        strokeWidth: 2,
        opacity: 0.7
    },
    penStyle: {
        strokeColor: 'red',
        strokeWidth: 5,
        opacity: 1
    },
    angleLabelStyle: {
        fillColor: 'red',
        fontFamily: 'Courier New',
        fontWeight: 'bold',
        fontSize: 8,
        opacity: 0.7
    },
    backgroundLineStyle: {
        strokeColor: '#aaddff'
    }
};

var negativeStyles = {
    pathStyle: {
        fillColor: 'white',
        strokeColor: 'white',
        strokeWidth: 2,
        opacity: 0.7
    },
    penStyle: {
        strokeColor: '#f55b5b',
        strokeWidth: 5,
        opacity: 1
    },
    angleLabelStyle: {
        fillColor: '#f55b5b',
        fontFamily: 'Courier New',
        fontWeight: 'bold',
        fontSize: 8,
        opacity: 0.7
    },
    backgroundLineStyle: {
        strokeColor: '#425070'
    }
};

class Stroke {
    constructor( path ) {
        this.path = path;
        this.path.set( styles.pathStyle );
        this.reverse = false;
        this.calculatePaths();
        // window.addEventListener( 'resize', () => this.calculatePaths() );
    }
    reapplyStyles() {
        this.path.set( styles.pathStyle );
    }
    calculatePaths() {
        this.incoming = new paper.Path( this.path.segments );
        this.outgoing = new paper.Path( this.incoming.removeSegments( this.incoming.segments.length / 2 ) );
        this.length = this.incoming.length;
    }
    getPhase( phaseLength ) {
        this.calculatePaths();
        var incoming = new paper.Path( this.reverse ? this.outgoing.segments : this.incoming.segments );
        var outgoing = new paper.Path( this.reverse ? this.incoming.segments : this.outgoing.segments );

        var outgoingPhaseLength = ( ( this.length - phaseLength ) / this.length ) * this.outgoing.length;

        // console.log( phaseLength, outgoingPhaseLength );

        incoming.splitAt( this.reverse ? ( this.outgoing.length - outgoingPhaseLength ) : phaseLength );
        incoming.segments[ incoming.segments.length - 1 ].handleOut.set( 0, 0 );

        outgoing = outgoing.splitAt( this.reverse ? ( this.incoming.length - phaseLength ) : outgoingPhaseLength );
        if ( outgoing.segments.length > incoming.segments.length ) {
            outgoing.removeSegments( 0, 1 );
        } else if ( incoming.segments.length > outgoing.segments.length ) {
            incoming.removeSegments( incoming.segments.length - 1 );
            incoming.segments[ incoming.segments.length - 1 ].handleOut.set( 0, 0 );
        }
        outgoing.segments[ 0 ].handleIn.set( 0, 0 );
        
        incoming.addSegments( outgoing.segments );

        incoming.closed = true;
        incoming.set( styles.pathStyle );

        // console.log( this.path, incoming, outgoing );

        return incoming;
    }
    getPhaseWithPen( phaseLength ) {
        var phase = this.getPhase( phaseLength );
        var phaseMiddle = Math.floor( phase.segments.length / 2 );
        var pen = new paper.Path( Object.assign( {
            segments: [ 
                phase.segments[ phaseMiddle - 1 ], 
                phase.segments[ phaseMiddle ] 
            ] 
        }, styles.penStyle ) );
        var angle = Math.round( 120 + pen.segments[1].point.subtract( pen.segments[0].point ).angle );
        if ( angle > 180 ) angle -= 180;
        var angleLabel = new paper.PointText( Object.assign( {
            point: pen.bounds.center.clone().add( 10, 0 ),
            content: angle + '°'
        }, styles.angleLabelStyle ) );
        var g = new paper.Group();

        g.addChild( phase );
        g.addChild( pen );
        g.addChild( angleLabel );

        return g;
    }
}

class Letter {
    constructor( font, char ) {
        this.strokes = [];
        this.strokeLengths = [];
        this.length = 0;
        this.reverse = false;
        this.g = new paper.Item().importSVG( '<svg>' + font.getPath( char, 0, 750, 1000 ).toSVG() + '</svg>' );
        this.g = this.g;
        if ( this.g.firstChild.className == 'Path' ) {
            var paths = this.g.removeChildren();
            this.g.addChild( new paper.CompoundPath( {
                children: paths
            } ) );
        }
        this.g.firstChild.children.forEach( path => {
            var s = new Stroke( path );
            this.strokes.push( s );
            this.strokeLengths.push( s.length );
            this.length += s.length;
        } );
    }
    reapplyStyles() {
        this.strokes.forEach( s => s.reapplyStyles() );
    }
    centerLetter() {
        this.g.position.x = window.innerWidth / 2;
    }
    reversePaths() {
        this.reverse = !this.reverse;
        this.strokes.forEach( s => {
            s.reverse = this.reverse;
        } );
    }
    calculateLength() {
        this.length = 0;
        this.strokes.forEach( s => {
            s.calculatePaths();
            this.length += s.length;
        } );
    }
    getPhase( offset ) {
        if ( offset < 0 ) offset = 0;
        if ( offset > 1 ) offset = 1;
        var g = new paper.Group(), 
            idx = 0, 
            ss = this.strokes, 
            pl = offset * this.length, 
            ol = 0,
            addedCompleteChildren = 0,
            addedPartialChildren = 0;
        if ( !offset ) return g;
        if ( offset == 1 ) {
            ss.forEach( stroke => g.addChild( stroke.path.clone() ) );
            return g;
        }
        while ( idx < ss.length ) {
            if ( pl < ol + ss[ idx ].length ) {
                g.addChild( ss[ idx ].getPhaseWithPen( pl - ol ) );
                addedPartialChildren += 1;
                break;
            } else {
                g.addChild( ss[ idx ].path.clone() );
                addedCompleteChildren += 1;
            }
            ol += ss[ idx ].length;
            idx += 1;
        }
        // console.log( g, addedCompleteChildren, addedPartialChildren );
        return g;
    }
}

class Font {
    
    constructor( options ) {
        this.src = "fonts/CalligrapherFont-Regular.otf";
        this.letterList = [ 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ', 'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת' ];
        this.letters = [];
        this.currentLetter = 0;
        this.scaleFactor = 1;
        this.g = new paper.Group();
        // this.centerLetter();
        Object.assign( this, options );
    }

    load( cb ) {
        if ( !opentype ) return false;
        opentype.load( this.src, ( err, font ) => {
            if ( err ) {
                console.error( 'Font could not be loaded: ' + err );
            } else {
                this.font = font;
                this.letterList.forEach( char => {
                    var letter = new Letter( font, char );
                    this.letters.push( letter );
                    this.g.addChild( letter.g );
                } );
                this.centerLetter();
                window.addEventListener( 'resize', () => this.centerLetter() );
                cb();
            }
        } );
        return this;
    }

    reapplyStyles() {
        this.letters.forEach( l => l.reapplyStyles() );
    }

    centerLetter() {
        // console.log( this.g.bounds );
        this.g.position.x = window.innerWidth / 2;
        this.g.position.y = window.innerHeight / 2;
        this.letters.forEach( letter => letter.centerLetter() );
        if ( window.innerHeight / 1000 == this.scaleFactor ) return;
        var newScaleFactor = window.innerHeight / 1000;
        // console.log( newScaleFactor / this.scaleFactor );
        this.g.scaling.set( newScaleFactor / this.scaleFactor, newScaleFactor / this.scaleFactor );
        this.scaleFactor = newScaleFactor;
        this.letters.forEach( letter => letter.calculateLength() );
        // console.log( this.scaleFactor );
    }

    reversePaths() {
        this.letters.forEach( l => l.reversePaths() );
    }

    nextLetter() {
        this.currentLetter += 1;
        if ( this.currentLetter == this.letterList.length ) {
            this.currentLetter = 0;
        }
    }

    previousLetter() {
        this.currentLetter -= 1;
        if ( this.currentLetter < 0 ) {
            this.currentLetter = this.letterList.length - 1;
        }
    }

    setCurrentLetter( char ) {
        var idx = this.letterList.indexOf( char );
        if ( idx > -1 ) {
            this.currentLetter = idx;
        }
    }

    getCurrentLetterPhase( offset ) {
        return this.letters[ this.currentLetter ].getPhase( offset );
    }

}

function createBackground() {
    var bg;
    if ( 'background' in paper.project.layers ) {
        bg = paper.project.layers.background;
        bg.removeChildren();
    } else {
        bg = new paper.Layer();
        bg.name = 'background';    
    }
    var baseline = new paper.Path.Line( Object.assign( {
        from: [ 0, window.innerHeight * 0.75 ],
        to: [ window.innerWidth, window.innerHeight * 0.75 ]
    }, styles.backgroundLineStyle ) );
    var midline = new paper.Path.Line( Object.assign( {
        from: [ 0, window.innerHeight * 0.25 ],
        to: [ window.innerWidth, window.innerHeight * 0.25 ],
    }, styles.backgroundLineStyle ) );
    var anglevector = new paper.Point( {
        angle: -60,
        length: window.innerHeight * 0.58
    } );
    var anglepoint = new paper.Point( {
        x: -(window.innerWidth / 50 * 20),
        y: window.innerHeight * 0.75
    } );
    for ( var i = 0; i < 80; i++ ) {
        bg.addChild( new paper.Path.Line( Object.assign( {
            from: anglepoint.clone(),
            to: anglepoint.clone().add( anglevector )
        }, styles.backgroundLineStyle ) ) );
        anglepoint.x += window.innerWidth / 50;
    }
    bg.addChild( baseline );
    bg.addChild( midline );
    paper.project.insertLayer( 0, bg );
    paper.project.layers.letter.activate();
}

function setColorScheme() {

}

function animate( time ) {
    requestAnimationFrame( animate );
    TWEEN.update( time );
}
    
window.onload = function() {

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

    var canvasEl = document.getElementById( 'calligrapherCanvas' );
    var letterLabelEl = document.getElementById( 'letterLabel' );
    var previousButtonEl = document.getElementById( 'previousButton' );
    var nextButtonEl = document.getElementById( 'nextButton' );
    var reverseButtonEl = document.getElementById( 'reverseButton' );
    var infoButtonEl = document.getElementById( 'infoButton' );
    var infoEl = document.getElementById( 'information' );

    paper.setup( "calligrapherCanvas" );

    paper.settings.insertItems = false;

    paper.project.activeLayer.name = 'letter';

    var darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    styles = darkModeMediaQuery.matches ? negativeStyles : positiveStyles;

    createBackground();
    window.addEventListener( 'resize', createBackground );

    var f = new Font().load( () => {

        // console.log( f.g );

        var phase = { offset: 0 };
        var down = false;
        var t_o;
        var infoActive = false;

        var getDuration = () => {
            return f.letters[ f.currentLetter ].length * ( 1000 / window.innerHeight ) * 2;
        };

        var ondown = () => {
            clearTimeout( t_o );
            down = true;
        };
        var onup = () => {
            clearTimeout( t_o );
            down = false;
            tween.to( { offset: 1 }, getDuration() * ( 1 - phase.offset ) );
            t_o = setTimeout( () => tween.start(), 500 );
        };
        var redrawPhase = () => {
            paper.project.layers.letter.removeChildren();
            f.centerLetter();
            paper.project.layers.letter.addChild( f.getCurrentLetterPhase( phase.offset ) ); 
        };

        // console.log( f.letters[ 0 ].length * 10 );

        var tween = new TWEEN.Tween( phase )
            .to( { offset: 1 }, getDuration() )
            .onUpdate( () => {
                redrawPhase( phase.offset );
            } )
            .start();
            
        letterLabelEl.innerText = f.letterList[ f.currentLetter ];

        requestAnimationFrame( animate );

        darkModeMediaQuery.addListener((e) => {
            styles = e.matches ? negativeStyles : positiveStyles;
            createBackground();
            f.reapplyStyles();
            redrawPhase();
        });

        canvasEl.addEventListener( 'mousedown', ondown );
        canvasEl.addEventListener( 'mouseup', onup );
        canvasEl.addEventListener( 'mousemove', e => {
            if ( !down ) return;
            tween.stop();
            phase.offset = ( ( 1 - e.clientX / window.innerWidth ) * 1.5 ) - 0.25;
            redrawPhase();
        } );

        canvasEl.addEventListener( 'touchstart', ondown );
        canvasEl.addEventListener( 'touchend', onup );
        canvasEl.addEventListener( 'touchmove', e => {
            tween.stop();
            phase.offset = ( ( 1 - e.touches[0].clientX / window.innerWidth ) * 1.5 ) - 0.25;
            redrawPhase();
        } );

        previousButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            f.previousLetter();
            phase.offset = 0;
            tween.to( { offset: 1 }, getDuration() ).start();
            letterLabelEl.innerText = f.letterList[ f.currentLetter ];
        } );

        nextButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            f.nextLetter();
            phase.offset = 0;
            tween.to( { offset: 1 }, getDuration() ).start();
            letterLabelEl.innerText = f.letterList[ f.currentLetter ];
        } );

        reverseButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            f.reversePaths();
            e.currentTarget.className = e.currentTarget.className == 'button reversed' ? 'button' : 'button reversed';
            phase.offset = 0;
            tween.to( { offset: 1 }, getDuration() ).start();
        } );
        
        infoEl.addEventListener( 'click', e => {
            if ( infoActive ) {
                infoActive = false;
                infoEl.className = '';    
            }
        } );

        infoButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            infoActive = !infoActive;
            infoEl.className = infoActive ? 'active' : '';
        }, true );

        document.addEventListener( 'keydown', e => {
            if ( e.code in keyCodeMap ) {
                f.setCurrentLetter( keyCodeMap[ e.code ] );
                phase.offset = 0;
                tween.to( { offset: 1 }, getDuration() ).start();
            } else {
                switch ( e.code ) {
                    case 'ArrowLeft':
                        f.nextLetter();
                        phase.offset = 0;
                        tween.to( { offset: 1 }, getDuration() ).start();
                        letterLabelEl.innerText = f.letterList[ f.currentLetter ];
                        break;
                    case 'ArrowRight':
                        f.previousLetter();
                        phase.offset = 0;
                        tween.to( { offset: 1 }, getDuration() ).start();
                        letterLabelEl.innerText = f.letterList[ f.currentLetter ];
                        break;                        
                }
            }
        } );

    } );

};