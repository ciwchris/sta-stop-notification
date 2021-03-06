/*!
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
/* eslint-env browser */
(function() {
    'use strict';

    // Check to make sure service workers are supported in the current browser,
    // and that the current page is accessed from a secure origin. Using a
    // service worker from an insecure origin will trigger JS console errors. See
    // http://www.chromium.org/Home/chromium-security
    // /prefer-secure-origins-for-powerful-new-features
    var isLocalhost = Boolean(window.location.hostname === 'localhost' ||
                              // [::1] is the IPv6 localhost address.
                              window.location.hostname === '[::1]' ||
                              // 127.0.0.1/8 is considered localhost for IPv4.
                              window.location.hostname.match(
                                      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
                              )
                             );

    const applicationServerPublicKey = 'BGPwmeJvcajyK7v-H3_tdESj9VwLpbO_I4oYrI4rnPlWERU2LGtrlD25o' +
          'xGZ7vf0D8rJO4M0crHQ2SbhvCelahs';

    const pushButton = document.querySelector('.js-push-btn');

    let isSubscribed = false;
    let swRegistration = null;

    if ('serviceWorker' in navigator && 'PushManager' in window &&
        (window.location.protocol === 'https:' || isLocalhost)) {
        navigator.serviceWorker.register('service-worker.js')
            .then(function(registration) {
                swRegistration = registration;
                initialiseUI();

                // updatefound is fired if service-worker.js changes.
                registration.onupdatefound = function() {
                    // updatefound is also fired the very first time the SW is installed,
                    // and there's no need to prompt for a reload at that point.
                    // So check here to see if the page is already controlled,
                    // i.e. whether there's an existing service worker.
                    if (navigator.serviceWorker.controller) {
                        // The updatefound event implies that registration.installing is set:
                        // https://slightlyoff.github.io/
                        // ServiceWorker/spec/service_worker/index.html
                        // #service-worker-container-updatefound-event
                        var installingWorker = registration.installing;

                        installingWorker.onstatechange = function() {
                            switch (installingWorker.state) {
                            case 'installed':
                                // At this point, the old content will have been purged and the
                                // fresh content will have been added to the cache.
                                // It's the perfect time to display a "New content is
                                // available; please refresh." message in the page's interface.
                                break;

                            case 'redundant':
                                throw new Error('The installing ' +
                                                'service worker became redundant.');

                            default:
                                // Ignore
                            }
                        };
                    }
                };
            }).catch(function(e) {
                console.error('Error during service worker registration:', e);
            });
    } else {
        pushButton.textContent = 'Push Not Supported';
    }

    // Your custom JavaScript goes here

    /**
     * Changes base64 string to array for push notification subscription
     * @param {string} base64String the base64 to transform
     * @return {int[]} the transformed string
     */
    function urlB64ToUint8Array(base64String) {
        var padding = '='.repeat((4 - base64String.length % 4) % 4);
        var base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        var rawData = window.atob(base64);
        var outputArray = new Uint8Array(rawData.length);

        for (var i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Update push notification button to proper state
     */
    function updateBtn() {
        if (Notification.permission === 'denied') {
            pushButton.textContent = 'Push Messaging Blocked.';
            pushButton.disabled = true;
            updateSubscriptionOnServer(null);
            return;
        }

        if (isSubscribed) {
            pushButton.textContent = 'Disable notification';
        } else {
            pushButton.textContent = 'Enable notification';
        }

        pushButton.disabled = false;
    }

    /**
     * Shows UI elements when service workers and push notifications are supported
     */
    function initialiseUI() {
        pushButton.addEventListener('click', function() {
            pushButton.disabled = true;
            if (isSubscribed) {
                unsubscribeUser();
            } else {
                subscribeUser();
            }
        });

        // Set the initial subscription value
        swRegistration.pushManager.getSubscription()
            .then(function(subscription) {
                isSubscribed = !(subscription === null);

                if (isSubscribed) {
                    console.log('User IS subscribed.');
                } else {
                    console.log('User is NOT subscribed.');
                }

                updateBtn();
            });
    }

    /**
     * Subscribes the browser to push notifications
     */
    function subscribeUser() {
        var applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
        swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        })
            .then(function(subscription) {
                console.log('User is subscribed:', subscription);

                updateSubscriptionOnServer(subscription);

                isSubscribed = true;

                updateBtn();
            })
            .catch(function(err) {
                console.log('Failed to subscribe the user: ', err);
                updateBtn();
            });
    }

    /**
     * Unsubscribes the browser to push notifications
     */
    function unsubscribeUser() {
        swRegistration.pushManager.getSubscription()
            .then(function(subscription) {
                if (subscription) {
                    return subscription.unsubscribe();
                }
            })
            .catch(function(error) {
                console.log('Error unsubscribing', error);
            })
            .then(function() {
                console.log('User is unsubscribed.');
                isSubscribed = false;

                updateBtn();
            });
    }

    /**
     * Notifies the server of the user subscription
     * @param {string} subscription - the browser generated subscription id
     */
    function updateSubscriptionOnServer(subscription) {
        // subscribe
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    console.log(response);
                }
            }
        };
        console.log(JSON.stringify(subscription));
        request.open('POST', 'https://sta-notification.azurewebsites.net/api/web-push', true);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(JSON.stringify(subscription));
    }
})();
