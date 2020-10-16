
var Calligrapher = {};

Calligrapher.Pen = function( options ) {

    if ( 'undefined' === typeof options ) options = {};

    this.position = new paper.Point( options.x || 0, options.y || 0 );
    this.size = new paper.Size( options.width || 100, options.height || 5 );
    this.angle = options.angle || -60;
    this.color = options.color || 'black';

    this._penLayer = new paper.Layer();

    this._pen = new paper.Shape.Rectangle( {
        position: this.position,
        size: this.size,
        rotation: this.angle,
        fillColor: this.color
    } );

    this._pen.addTo( this._penLayer );

    this.penPoint = new paper.Point( { length: this.size.width / 2, angle: this.angle } );

}

Object.assign( Calligrapher.Pen.prototype, {

    refresh() {
        this._pen.remove();
        this._pen = new paper.Shape.Rectangle( {
            position: this.position,
            size: this.size,
            rotation: this.angle,
            fillColor: this.color
        } );
    },

    place( point ) {
        this.position.set( point );
    },

    resize( width, height ) {
        this.size.width = width;
        this.size.height = height;
        this.penPoint.length = width / 2;
    },

    rotate( angle ) {
        this.angle = angle;
        this._pen.rotation = angle;
        this.penPoint.angle = angle;
    },

    createOutgoingSegment( segment ) {
        return new paper.Segment( { 
            point: segment.point.add( this.penPoint ),
            handleIn: segment.handleIn,
            handleOut: segment.handleOut
        } );
    },

    createIncomingSegment( segment ) {
        return new paper.Segment( { 
            point: segment.point.subtract( this.penPoint ),
            handleIn: segment.handleOut,
            handleOut: segment.handleIn
        } );
    },

    createStroke( path, stroke, angles ) {
        var incoming = path.clone( { insert: false } );
        incoming.removeSegments( path.segments.length / 2 );
        var outgoing = path.clone( { insert: false } );
        outgoing.removeSegments( 0, path.segments.length / 2 );
        incoming.splitAt( incoming.length * 0.5 );
        outgoing = outgoing.splitAt( outgoing.length * 0.5 );
        incoming.segments[ incoming.segments.length - 1 ].handleOut.set( 0, 0 );
        outgoing.segments[ 0 ].handleIn.set( 0, 0 );        
        incoming.join( outgoing );
        incoming.strokeColor = 'black';
        incoming.closed = true;
        incoming.fillColor = undefined;
        console.log( incoming );
        incoming.addTo( paper.project.activeLayer );
        return incoming;
        console.log( incoming.segments, outgoing.segments );

        stroke.removeSegments();
        var i;
        for ( i = 0; i < path.segments.length; i++ ) {
            if ( angles[ i ] ) this.rotate( angles[ i ] );
            stroke.add( this.createOutgoingSegment( path.segments[ i ] ) );
        }
        stroke.lastSegment.handleOut = undefined;
        for ( i = path.segments.length - 1; i >= 0; i-- ) {
            if ( angles[ i ] ) this.rotate( angles[ i ] );
            stroke.add( this.createIncomingSegment( path.segments[ i ] ) );
            if ( i == path.segments.length - 1 ) {
                stroke.lastSegment.handleIn = undefined;
            }
        }
        this.rotate( angles[ path.segments.length - 1 ] );
        return stroke;
    },

    hide() {
        this._pen.opacity = 0;
    },

    show() {
        this._pen.opacity = 100;
    }

} );

Calligrapher.Stroke = function( path, layer ) {

    this.offset = 0;

    this.path = path;

    this.path.closed = false;

    this.angles = [];

    path.segments.forEach( ( segment ) => {
        this.angles.push( -30 - Math.floor( Math.random() * 30 ) );
    } );

    this.layer = layer;

    layer.activate();

    this.shape = new paper.Path( {
        strokeWidth: 5,
        strokeColor: '#888',
        fillColor: '#888',
        closed: true,
        segments: [ path.segments.firstSegment ]
    } );

    this.shape.blendMode = 'multiply';

    this.shape.addTo( this.layer );

    this.length = path.length;

}

Object.assign( Calligrapher.Stroke.prototype, {

    showSkeleton() {
        var skeleton = this.path.copyTo( this.layer );
        skeleton.strokeColor = 'black';
        skeleton.fillColor = undefined;
        skeleton.fullySelected = true;
    },

    placePenAt( pen, offset ) {

        if ( 'undefined' === typeof offset ) offset = this.offset;

        pen.place( this.path.getPointAt( this.length * offset ) );

    },

    drawPhase( pen, offset ) {

        if ( 'undefined' === typeof offset ) offset = this.offset;

        var phasePath = this.path.clone( { insert: false } );

        phasePath.splitAt( Math.floor( phasePath.length * offset ) );

        pen.createStroke( phasePath, this.shape, this.angles );

    },

    drawWithPen( pen, options ) {

        if ( 'undefined' === typeof options ) options = {};

        var offset = ( 'offset' in options ) ? options.offset : 1;

        var duration = ( 'duration' in options ) ? options.duration : this.length;

        var coords = { offset: this.offset };

        var tween = new TWEEN.Tween( coords )

            .to( { offset: offset }, duration )

            .easing( TWEEN.Easing.Quadratic.Out )

            .onUpdate( () => {

                this.drawPhase( pen, coords.offset );

                this.placePenAt( pen, coords.offset );

            } )

            .onComplete( 'oncomplete' in options ? options.oncomplete : function() {} )
            
            .start();

    },

    render( pen ) {
        pen.createStroke( this.path, this.shape, this.angles );
    }
    
} );

Calligrapher.Letter = function() {

    this._letterLayer = new paper.Layer();

    this._letterLayer.addTo( paper.project );

    this._letterLayer.sendToBack();

    this._pen = new Calligrapher.Pen();

    this.width = window.innerWidth;

    this.height = window.innerHeight;

    this.strokes = [];

}

Object.assign( Calligrapher.Letter.prototype, {

    reset() {

        this._letterLayer.removeChildren();

    },

    load( svg ) {

        this.reset();

        var loaded = new paper.Item().importSVG( svg );

        console.log( loaded.exportJSON() );

        loaded = loaded.firstChild;

        loaded.position = new paper.Point( window.innerWidth / 2, window.innerHeight / 2 );

        this.paths = loaded.children;

        this.paths.forEach( ( path ) => this.strokes.push( new Calligrapher.Stroke( path, this._letterLayer ) ) );

        this.width = loaded.bounds.x + loaded.bounds.width + 250;

        this.height = loaded.bounds.y + loaded.bounds.height + 250;

    },

    renderSkeleton() {

        this.strokes.forEach( ( stroke ) => stroke.showSkeleton() );

    },

    render() {

        this.strokes.forEach( ( stroke ) => stroke.render( this._pen ) );

    },

    draw() {

        this._letterLayer.activate();

        var strokeIndex = 0;

        var drawStroke = () => {

            this._pen.show();

            var stroke = this.strokes[ strokeIndex ];

            stroke.drawWithPen( this._pen, { 
                duration: stroke.length * 10,
                oncomplete: () => {
                    strokeIndex += 1;
                    if ( strokeIndex < this.strokes.length ) {
                        drawStroke();
                    } else {
                        this._pen.hide();
                    }
                }
            } );
    
        }
        
        drawStroke();
    
    }

} );

var animate = function( time ) {

    requestAnimationFrame( animate );

    TWEEN.update( time );

}

var init = function() {

    var canvas = document.getElementById( "calligrapherCanvas" );

    paper.setup( canvas );

    paper.settings.insertItems = false;
    
    var letter = new Calligrapher.Letter();

    opentype.load( 'fonts/CalligrapherFont-Regular.otf', function( err, font ) {
        if ( err ) {
            console.error( 'Font could not be loaded: ' + err );
        } else {
            var path = font.getPath( 'א', 0, 400, 600 );
            console.log( path );
            window.svgEl = document.createElement( 'SVG' );
            svgEl.innerHTML = path.toSVG();
            letter.load( svgEl );
            // letter.renderSkeleton();
            letter.render();
        }
    } );

    requestAnimationFrame( animate );

}

window.onload = function() {

    init();

}