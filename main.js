ymaps.ready(init);

function init() {

    const map = new ymaps.Map('map', {
        center: [55.75320640051442, 37.622596207631304],
        zoom: 12,
        controls: ['zoomControl'],
        behaviors: ['drag']
    });

    const clusterTemlate = ymaps.templateLayoutFactory.createClass(reviewInCluster__template.textContent, {
        build: function() {
            this.constructor.superclass.build.call(this);
            const data = this.getData().properties._data;

            this.getParentElement().querySelector('.review__addressLink').addEventListener('click', e=>{
                e.preventDefault();
                openBaloon(data.coords)
            })
        }
    })

    let clusterer = new ymaps.Clusterer({
            preset: 'islands#invertedVioletClusterIcons',
            groupByCoordinates: false,
            clusterDisableClickZoom: true,
            clusterBalloonContentLayout: 'cluster#balloonCarousel',
            clusterBalloonItemContentLayout: clusterTemlate,
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

            let coords;
            const root = this.getParentElement().querySelector('#modalWindow');
            const reviewsElem = root.querySelector('.modalWindow__reviews');

            this._rootPosition = root.getBoundingClientRect();

            if (this.getData()['geoObject']) {
                const data = this.getData().properties._data;

                coords = data.coords;
                reviewsElem.innerHTML = new ymaps.Template(review__template.textContent).build(new ymaps.data.Manager(data.review)).text;
            } else {
                coords = this.getData().coords;

                if (reviews[coords.join(':')]) {
                    reviewsElem.innerHTML = '';
                    reviews[coords.join(':')].forEach(review=>{
                        reviewsElem.innerHTML += new ymaps.Template(review__template.textContent).build(new ymaps.data.Manager(review)).text;
                    })
                }
            }


            ymaps.geocode(coords).then(res=>{
                const address = res.geoObjects.get(0).properties.get('text');

                root.querySelector('.modalWindow__head-title').textContent = address;

                root.querySelector('.modalWindow__head-cross').addEventListener('click', this.onCloseClick.bind(this));

                root.querySelector('.modalWindow__formAddBtn').addEventListener('click', e=>{
                    const time = new Date();
                    console.log(time.getMonth());
                    const review = new Review(
                        root.querySelector('.modalWindow__formNameField').value,
                        root.querySelector('.modalWindowPlaceField').value,
                        `${(time.getDate()<10)?'0':''}${time.getDate()}.${(time.getMonth()<10)?'0':''}${time.getMonth()}.${time.getFullYear()}, ${time.getHours()}:${(time.getMinutes()<10)?'0':''}${time.getMinutes()}`,
                        root.querySelector('.modalWindow__formReviewField').value,
                        address);

                    if (!reviews[coords.join(':')]) {
                        reviewsElem.innerHTML = ''
                    }


                    reviewsElem.innerHTML += new ymaps.Template(review__template.textContent).build(new ymaps.data.Manager(review)).text;

                    if (!reviews[coords.join(':')]) {
                        reviews[coords.join(':')] = []
                    }

                    reviews[coords.join(':')].push(review);

                    clusterer.add(createPlacemark(coords, review));
                })
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
    
    ymaps.layout.storage.add('my#modalWindowlayout', modalWindowLayout);

    map.events.add('click', e=>openBaloon(e.get('coords')));


    function openBaloon(coords) {
        map.balloon.open(coords, {coords: coords}, {
            layout: 'my#modalWindowlayout',
            autoPan: true,
            autoPanMargin: 40
        });
    }

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

