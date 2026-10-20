Feature: The Nature & Demeanor screen keeps to the browser's habits and to the build as it is now

  The slice scenarios hold what the Nature & Demeanor screen does; the cases here are the ones the page and
  the browser share: focus staying where the player left it, a search that outlives a role switch, a notice
  that goes when it stops being true and stays gone, a search that is announced once typing settles, and the
  search shortcut where it must be left alone.

  Scenario: Pressing a name keeps focus on it
    Given I am on the Nature & Demeanor screen of a new build
    When I focus Visionary and press Enter
    Then Visionary is marked "N"
    And focus is still on Visionary

  Scenario: Switching the role keeps the search and its list
    Given I am on the Nature & Demeanor screen of a new build
    When I search the archetypes for "vis"
    And I switch to Demeanor
    Then the archetype search still reads "vis"
    And only the archetype Visionary is listed

  Scenario: The own archetype field shows the active role
    Given Visionary is assigned as Nature
    Then my own archetype field reads "Visionary"
    When I switch to Demeanor
    Then my own archetype field reads ""

  Scenario: The assignment notice goes when the role no longer holds the name
    Given I am on the Nature & Demeanor screen of a new build
    When I assign Visionary as Nature
    Then the assignment "Visionary assigned as Nature." is announced
    When I empty my own archetype with Nature active
    Then the assignment notice is empty

  Scenario: The assignment notice does not come back when typing makes the field match again
    Given I am on the Nature & Demeanor screen of a new build
    When I assign Visionary as Nature
    And I empty my own archetype with Nature active
    And I enter "Visionary" as my own archetype
    Then the assignment notice is empty

  Scenario: The own archetype field is named for the active role
    Given I am on the Nature & Demeanor screen of a new build
    Then my own archetype field is labelled "Your own Nature"
    When I switch to Demeanor
    Then my own archetype field is labelled "Your own Demeanor"

  Scenario: The search is announced once typing settles
    Given I am on the Nature & Demeanor screen of a new build
    When I type "vis" into the archetype search one key at a time
    Then the archetype result count "1 archetype listed" is announced once

  Scenario: The search hint steps aside while the search holds text
    Given I am on the Nature & Demeanor screen of a new build
    Then the archetype search hint is shown
    When I search the archetypes for "vis"
    Then the archetype search hint is hidden
    When I empty the archetype search
    Then the archetype search hint is shown

  Scenario: The arrow keys switch the role
    Given I am on the Nature & Demeanor screen of a new build
    When I focus the Nature option and press ArrowRight
    Then the role switch has Demeanor active

  Scenario: The search shortcut is left to the browser behind a modal dialog
    Given I am on the Nature & Demeanor screen of a new build
    And the platform is "other"
    And I am on the Nature & Demeanor screen
    Then Control+K is taken by the page
    When I open Creation settings
    Then Control+K is left to the browser

  Scenario: The search shortcut is left to the browser on another screen
    Given I am on the Nature & Demeanor screen of a new build
    And the platform is "other"
    And I am on the Character concept screen
    Then Control+K is left to the browser
