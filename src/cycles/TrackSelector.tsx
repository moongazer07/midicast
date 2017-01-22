/** @license
 *  Copyright 2016 - present The Midicast Authors. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not
 *  use this file except in compliance with the License. You may obtain a copy
 *  of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  License for the specific language governing permissions and limitations
 *  under the License.
 */

import {
  Observable,
} from 'rxjs';

import * as _ from 'lodash';
import * as MIDIConvert from 'midiconvert';

import {
  VNode,
  html,
} from 'snabbdom-jsx';

import {
  svg,
} from '@cycle/dom';

import {
  Block,
  CenteredColumn,
  FlexibleColumn,
  FlexibleRow,
  InflexibleColumn,
  InflexibleRow,
  Row,
} from '../snabstyle';

import {
  Dict,
  MessageType,
  Sinks,
  Song,
  Sources,
} from '../types';

import {
  wrapWithMessage,
} from '../utils';

type Tracks = Array<MIDIConvert.Track>;

export default function TrackSelector({ DOM, messages: message$, ...sources }: Sources<any>): Sinks {
  const currentTracks$: Observable<Tracks> = message$.filter(
    message => message.type === MessageType.SONG_CHANGED
  ).pluck('payload').pluck('tracks').map(
    (currentTracks: Tracks) => currentTracks.filter(
      track => track.notes.length
    )
  );

  const activeTrackIDs$: Observable<Array<number>> = message$.filter(
    message => message.type === MessageType.ACTIVE_TRACKS_CHANGED
  ).pluck('payload');

  const changeActiveTracksMessage$ = DOM.select('input').events('change').map(
    event => {
      const dataset = (event.target as any).parentNode.dataset;
      const payload: Dict<any> = {
        active: (event.target as HTMLInputElement).checked,
      };

      if (dataset.query) {
        payload['query'] = dataset.query;
      } else {
        payload['id'] = parseInt(dataset.index, 10);
      }

      return {
        type: payload['query']
          ? MessageType.CHANGE_ACTIVE_TRACKS
          : MessageType.CHANGE_TRACK_ACTIVE_STATUS,
        payload
      };
    }
  );

  return {
    DOM: Observable.combineLatest(
      currentTracks$,
      activeTrackIDs$,
    ).map(
      ([
        currentTracks,
        activeTrackIDs,
      ]) => (
        <FlexibleColumn
          component = 'ul'
          className = 'mdc-list'
        >
          <TrackRow
            query = 'all'
            title = 'All instruments'
            checked = {
              currentTracks.map(track => track.id).every(
                id => activeTrackIDs.includes(id)
              )
            }
          />

          <li
            role = 'separator'
            class ='mdc-list-divider'
          />

          {
            _.chain(currentTracks).groupBy(
              track => track.instrumentFamily || 'other'
            ).toPairs().map(
              ([ family, currentTracksInFamily ]) => (
                <Block
                  component = 'li'
                  listStyle = 'none'
                >
                  <TrackRow
                    query = 'family'
                    id = { family }
                    title = { family }
                    checked = {
                      currentTracksInFamily.map(track => track.id).every(
                        id => activeTrackIDs.includes(id)
                      )
                    }
                  />
                  <Block
                    component = 'ul'
                    listStyle = 'none'
                  >
                    {
                      currentTracksInFamily.map(
                        track => (
                          <TrackRow
                            index = { track.id }
                            title = { track.name }
                            subtitle = { track.instrument }
                            checked = { activeTrackIDs.includes(track.id) }
                          />
                        )
                      )
                    }
                  </Block>
                </Block>
              )
            ).value()
          }
        </FlexibleColumn>
      )
    ).startWith(''),

    messages: Observable.merge(
      Observable.of(
        {
          type: MessageType.UPDATE_STATUSES,
        }
      ),
      changeActiveTracksMessage$,
    )
  };
}

function TrackRow({ index, query, title = '', subtitle = '', checked, ...props }) {
  let component = 'label';

  if (typeof index !== 'number') {
    component = 'li';
  }

  const indexWidth = 16;
  const indexMargin = 8;

  let vtree = (
    <InflexibleRow
      component = { component }
      className = 'mdc-list-item'
    >
      <CenteredColumn className = 'mdc-list-item__start-detail'>
        <MDCCheckbox
          checked = { checked }
          attrs = {
            {
              'data-index': index,
              'data-query': query,
            }
          }
        />
      </CenteredColumn>

      <FlexibleColumn
        alignItems = 'stretch'
      >
        <Block
          cursor = 'pointer'
          marginLeft = { indexWidth + indexMargin }
        >
          { initialCase(title) }
        </Block>

        {
          index && subtitle
            ? <FlexibleRow
                fontSize = '.8em'
                opacity = { .8 }
              >
                <Block
                  width = { indexWidth }
                  marginRight = { indexMargin }
                  textAlign = 'right'
                >
                  { index }
                </Block>

                <Block>
                  { subtitle }
                </Block>
              </FlexibleRow>
            : ''
        }
      </FlexibleColumn>
    </InflexibleRow>
  );

  if (component !== 'li') {
    vtree = (
      <li>
        { vtree }
      </li>
    );
  }

  return vtree;
}

function MDCCheckbox({ checked, ...props }) {
  return (
    <div
      { ...props }
      className = { 'mdc-checkbox ' + (props.className || '') }
    >
      <input
        type = 'checkbox'
        className = 'mdc-checkbox__native-control'
        checked = { checked }
      />

      <div className = 'mdc-checkbox__background'>
        {
          // snabbdom-jsx won't let us set the class on an SVG element, so we
          // must fall back to hyperscript.
          //
          // https://github.com/yelouafi/snabbdom-jsx/issues/20
          svg(
            {
              attrs:{
                class: 'mdc-checkbox__checkmark',
                'xmlns': 'http://www.w3.org/2000/svg',
                'xml:space': 'preserve',
                'version': '1.1',
                'viewBox': '0 0 24 24',
              }
            },
            [
              svg.path(
                {
                  attrs:{
                    class: 'mdc-checkbox__checkmark__path',
                    fill: 'none',
                    stroke: 'white',
                    d: 'M1.73,12.91 8.1,19.28 22.79,4.59',
                  }
                }
              )
            ]
          )
        }
        <div className = 'mdc-checkbox__mixedmark'></div>
      </div>
    </div>
  );
}

function initialCase(label: string = '') {
  return label.substr(0, 1).toUpperCase() + label.substr(1).toLowerCase();
}
