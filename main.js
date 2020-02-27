ymaps.ready(init);

function init() {

    const map = new ymaps.Map('map', {
        center: [55.75320640051442, 37.622596207631304],
        zoom: 12,
        controls: ['zoomControl'],
        behaviors: ['drag']
    });

    const clusterTemlate = ymaps.templateLayoutFactory.createClass(reviewInCluster__template.textContent)

    let clusterer = new ymaps.Clusterer({
            preset: 'islands#invertedVioletClusterIcons',
            groupByCoordinates: false,
            clusterDisableClickZoom: true,
            clusterBalloonContentLayout: 'cluster#balloonCarousel',
            clusterBalloonItemContentLayout: clusterTemlate,
            clusterHideIconOnBalloonOpen: false,
            geoObjectHideIconOnBalloonOpen: false
        });

    clusterer.options.set({
        gridSize: 80,
        clusterDisableClickZoom: true
    });
 
    map.geoObjects.add(clusterer);

    const Review = function(author, place, time, salt, address) {
        this.author = author;
        this.place = place;
        this.time = time;
        this.salt = salt;
        this.address = address
    }

    const reviews = localStorage.reviews?JSON.parse(localStorage.reviews):{};

    window.onbeforeunload = function() {
        localStorage.reviews = JSON.stringify(reviews)
    };

    for(let place in reviews) {
        reviews[place].forEach(review=>{
            clusterer.add(createPlacemark(place.split(':'), review));
        }) 
    }
   
    const modalWindowLayout = ymaps.templateLayoutFactory.createClass(template.textContent, {
        build: function () {
            this.constructor.superclass.build.call(this);
            this._rootWindow = this.getParentElement().querySelector('#modalWindow');
            this._rootPosition = this._rootWindow.getBoundingClientRect();

            if(this.getData()['geoObject']) {
                coords = this.getData().properties._data.coords;
                this._rootWindow.querySelector('.modalWindow__reviews').innerHTML = '';
                this.getData().properties._data.reviews.forEach(el=>{
                    this._rootWindow.querySelector('.modalWindow__reviews').innerHTML += new ymaps.Template(review__template.textContent).build(new ymaps.data.Manager(el)).text;
                })

            } else {
                coords = this.getData().coords
            }


            ymaps.geocode(coords).then(res=>{
                this._address = res.geoObjects.get(0).properties;
                this._rootWindow.querySelector('.modalWindow__head-title').textContent = this._address.get('text');
            })

            this._rootWindow.querySelector('.modalWindow__head-cross').addEventListener('click', this.onCloseClick.bind(this));
            this._rootWindow.querySelector('.modalWindow__formAddBtn').addEventListener('click', e=>{
                const _root = this._rootWindow;
                const _date = new Date();
                const _review = new Review(
                        _root.querySelector('.modalWindow__formNameField').value,
                        _root.querySelector('.modalWindowPlaceField').value,
                        `${(_date.getDate()<10)?'0':''}${_date.getDate()}.
                        ${(_date.getMonth()<10)?'0':''}${_date.getMonth()}.
                        ${_date.getFullYear()}, 
                        ${_date.getHours()}:${_date.getMinutes()}
                        `,
                        _root.querySelector('.modalWindow__formReviewField').value,
                        this._address.get('text'));
                if (_root.querySelector('.modalWindow__reviews .modalWindow__reviewEmpty')) {
                    _root.querySelector('.modalWindow__reviews .modalWindow__reviewEmpty').remove()
                }
                _root.querySelector('.modalWindow__reviews').innerHTML += new ymaps.Template(review__template.textContent).build(new ymaps.data.Manager(_review)).text;

                
            
                if (!reviews[coords.join(':')]) reviews[coords.join(':')] = [];
                reviews[coords.join(':')].push(_review);

                clusterer.add(createPlacemark(coords));
                
            })
        },
        clear: function () {
            this.constructor.superclass.clear.call(this);
        },

        onCloseClick: function (e) {
            e.preventDefault();

            this.events.fire('userclose');
        },

        getShape: function () {
            return new ymaps.shape.Rectangle(new ymaps.geometry.pixel.Rectangle([
                [this._rootPosition.x, this._rootPosition.y], [
                    this._rootPosition.x + this._rootPosition.width,
                    this._rootPosition.y + this._rootPosition.height
                ]
            ]));
        },

    });
    

            // Помещаем созданный шаблон в хранилище шаблонов. Теперь наш шаблон доступен по ключу 'my#theaterlayout'.
    ymaps.layout.storage.add('my#modalWindowlayout', modalWindowLayout);

    var balloon = map.balloon;
    map.events.add('click', function (e) {
        balloon.open(e.get('coords'), {coords: e.get('coords')}, {
            layout: 'my#modalWindowlayout',
            autoPan: true,
            autoPanMargin: 40
        });
    });

    function createPlacemark(coords, review) {
        return new ymaps.Placemark(coords, {
            coords: coords, 
            review: review
        }, 
        {
            preset: 'islands#violetDotIcon',
            balloonLayout: 'my#modalWindowlayout'
        });
    }
}

