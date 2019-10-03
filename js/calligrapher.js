
var pathStyle = {
    fillColor: 'black',
    strokeColor: 'black',
    strokeWidth: 2,
    opacity: 0.7
};

var penStyle = {
    strokeColor: 'red',
    strokeWidth: 5,
    opacity: 1
};

class Stroke {
    constructor( path ) {
        this.path = path;
        this.path.set( pathStyle );
        this.calculatePaths();
        // window.addEventListener( 'resize', () => this.calculatePaths() );
    }
    calculatePaths() {
        this.incoming = new paper.Path( this.path.segments );
        this.outgoing = new paper.Path( this.incoming.removeSegments( this.incoming.segments.length / 2 ) );
        this.length = this.incoming.length;
    }
    getPhase( phaseLength ) {
        this.calculatePaths();
        var incoming = new paper.Path( this.incoming.segments );
        var outgoing = new paper.Path( this.outgoing.segments );

        var outgoingPhaseLength = ( phaseLength / incoming.length ) * outgoing.length;

        console.log( phaseLength, outgoingPhaseLength );

        incoming.splitAt( phaseLength );
        incoming.segments[ incoming.segments.length - 1 ].handleOut.set( 0, 0 );

        outgoing = outgoing.splitAt( this.length - outgoingPhaseLength );
        outgoing.segments[ 0 ].handleIn.set( 0, 0 );
        
        incoming.addSegments( outgoing.segments );

        incoming.closed = true;
        incoming.set( pathStyle );

        // console.log( this.path, incoming, outgoing );

        return incoming;
    }
    getPhaseWithPen( phaseLength ) {
        var phase = this.getPhase( phaseLength );
        var phaseMiddle = Math.floor( phase.segments.length / 2 );
        var pen = new paper.Path( [ phase.segments[ phaseMiddle - 1 ], phase.segments[ phaseMiddle ] ] );
        var g = new paper.Group();

        pen.set( penStyle );

        var angle = pen.segments[1].point.subtract( pen.segments[0].point ).angle;
        // console.log( angle );

        g.addChild( phase );
        g.addChild( pen );

        return g;
    }
}

class Letter {
    constructor( font, char ) {
        this.strokes = [];
        this.strokeLengths = [];
        this.length = 0;
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
        this.letterList = [ 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'ך', 'כ', 'ל', 'ם', 'מ', 'ן', 'נ', 'ס', 'ע', 'ף', 'פ', 'ץ', 'צ', 'ק', 'ר', 'ש', 'ת' ];
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

    centerLetter() {
        this.g.position.set( window.innerWidth / 2, window.innerHeight / 2 );
        if ( window.innerHeight / 1000 == this.scaleFactor ) return;
        var newScaleFactor = window.innerHeight / 1000;
        // console.log( newScaleFactor / this.scaleFactor );
        this.g.scaling.set( newScaleFactor / this.scaleFactor, newScaleFactor / this.scaleFactor );
        this.scaleFactor = newScaleFactor;
        this.letters.forEach( letter => letter.calculateLength() );
        // console.log( this.scaleFactor );
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

    getCurrentLetterPhase( offset ) {
        return this.letters[ this.currentLetter ].getPhase( offset );
    }

}

function createBackground() {
    var bg;
    if ( paper.project.layers[ 'background' ] ) {
        bg = paper.project.layers[ 'background' ];
        bg.removeChildren();
    } else {
        bg = new paper.Layer();
        bg.name = 'background';    
    }
    var baseline = new paper.Path.Line( {
        from: [ 0, window.innerHeight * 0.75 ],
        to: [ window.innerWidth, window.innerHeight * 0.75 ],
        strokeColor: '#aaddff'
    } );
    var midline = new paper.Path.Line( {
        from: [ 0, window.innerHeight * 0.25 ],
        to: [ window.innerWidth, window.innerHeight * 0.25 ],
        strokeColor: '#aaddff'
    } );
    var anglevector = new paper.Point( {
        angle: -60,
        length: window.innerHeight * 0.58
    } );
    var anglepoint = new paper.Point( {
        x: -100,
        y: window.innerHeight * 0.75
    } );
    for ( var i = 0; i < ( window.innerWidth + 100 ) / 20; i++ ) {
        bg.addChild( new paper.Path.Line( {
            from: anglepoint.clone(),
            to: anglepoint.clone().add( anglevector ),
            strokeColor: '#aaddff'
        } ) );
        anglepoint.x += 20;
    }
    bg.addChild( baseline );
    bg.addChild( midline );
    paper.project.insertLayer( 0, bg );
    paper.project.layers.letter.activate();
}

function animate( time ) {
    requestAnimationFrame( animate );
    TWEEN.update( time );
}
    
window.onload = function() {

    var canvasEl = document.getElementById( 'calligrapherCanvas' );
    var previousButtonEl = document.getElementById( 'previousButton' );
    var nextButtonEl = document.getElementById( 'nextButton' );

    paper.setup( "calligrapherCanvas" );

    paper.settings.insertItems = false;

    paper.project.activeLayer.name = 'letter';

    createBackground();
    window.addEventListener( 'resize', createBackground )

    var f = new Font().load( () => {

        // console.log( f.g );

        var phase = { offset: 0 };
        var down = false;
        var t_o;

        var ondown = () => {
            clearTimeout( t_o );
            down = true;
        };
        var onup = () => {
            clearTimeout( t_o );
            down = false;
            t_o = setTimeout( () => tween.start(), 500 );

        };
        var redrawPhase = () => {
            paper.project.layers.letter.removeChildren();
            f.centerLetter();
            paper.project.layers.letter.addChild( f.getCurrentLetterPhase( phase.offset ) ); 
        };

        // console.log( f.letters[ 0 ].length * 10 );

        var tween = new TWEEN.Tween( phase )
            .to( { offset: 1 }, f.letters[ 0 ].length * 10 )
            .onUpdate( () => {
                redrawPhase( phase.offset );
            } )
            .start();

        requestAnimationFrame( animate );

        canvasEl.addEventListener( 'mousedown', ondown );
        canvasEl.addEventListener( 'mouseup', onup );
        canvasEl.addEventListener( 'mousemove', e => {
            if ( !down ) return;
            tween.stop();
            phase.offset = ( e.clientX / window.innerWidth * 1.5 ) - 0.25;
            redrawPhase();
        } );

        canvasEl.addEventListener( 'touchstart', ondown );
        canvasEl.addEventListener( 'touchend', onup );
        canvasEl.addEventListener( 'touchmove', e => {
            tween.stop();
            phase.offset = ( e.touches[0].clientX / window.innerWidth * 1.5 ) - 0.25;
            redrawPhase();
        } );

        previousButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            f.previousLetter();
            phase.offset = 0;
            tween.start();
        } );

        nextButtonEl.addEventListener( 'click', e => {
            e.preventDefault();
            f.nextLetter();
            phase.offset = 0;
            tween.start();
        } );

    } );

};