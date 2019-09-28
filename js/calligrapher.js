
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
        this.incoming = new paper.Path( this.path.segments );
        this.outgoing = new paper.Path( this.incoming.removeSegments( this.incoming.segments.length / 2 ) );
        this.length = this.incoming.length;
    }
    getPhase( phaseLength ) {
        var incoming = new paper.Path( this.incoming.segments );
        var outgoing = new paper.Path( this.outgoing.segments );

        incoming.splitAt( phaseLength );
        incoming.segments[ incoming.segments.length - 1 ].handleOut.set( 0, 0 );

        outgoing = outgoing.splitAt( this.length - phaseLength );
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
        console.log( angle );

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
        var g = new paper.Item().importSVG( '<svg>' + font.getPath( char, 0, 0, window.innerHeight * 1.5 ).toSVG() + '</svg>' );
        g.position = new paper.Point( window.innerWidth / 2, window.innerHeight / 2 );
        g.firstChild.children.forEach( path => {
            var s = new Stroke( path );
            this.strokes.push( s );
            this.strokeLengths.push( s.length );
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
        this.letterList = [ 'א' ];
        this.letters = [];
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
                    this.letters.push( new Letter( font, char ) );
                } );
                cb();
            }
        } );
        return this;
    }

}

function animate( time ) {
    requestAnimationFrame( animate );
    TWEEN.update( time );
}
    
window.onload = function() {

    paper.setup( "calligrapherCanvas" );

    paper.settings.insertItems = false;

    var f = new Font().load( () => {

        var phase = { offset: 0 };

        var tween = new TWEEN.Tween( phase )
            .to( { offset: 1 }, f.letters[ 0 ].length * 10 )
            .onUpdate( () => {
                paper.project.activeLayer.removeChildren();
                paper.project.activeLayer.addChild( f.letters[ 0 ].getPhase( phase.offset ) );
            } )
            .start();
            
        requestAnimationFrame( animate );

        document.addEventListener( 'touchmove', e => {
            tween.stop();
            paper.project.activeLayer.removeChildren();
            paper.project.activeLayer.addChild( f.letters[ 0 ].getPhase( ( e.touches[0].clientX / window.innerWidth * 1.5 ) - 0.25 ) );
        } );

    } );

};