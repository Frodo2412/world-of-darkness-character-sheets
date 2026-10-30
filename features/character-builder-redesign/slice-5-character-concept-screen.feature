Feature: The Character concept screen

  Background:
    Given I am on the Character concept screen of a new build

  Scenario: Entering the opening details
    When I enter the name "Éloïse Voss" and the concept "Antiquarian searching for lost voices"
    And I enter "I preserve the stories others would erase" under "What keeps you going?"
    Then the identity bar reads "Éloïse Voss" with the initials "ÉV"
    And after reloading the builder all three entries are unchanged

  Scenario: Multi-line text is kept
    When I enter two lines under "What keeps you going?"
    Then after reloading the builder both lines are present

  Scenario: Table details are kept on the screen
    When I enter the player "Mara Leclerc", the chronicle "The Glass City" and the sire "Adrien Vale"
    Then the top bar reads "The Glass City / Character builder"
    And after reloading the builder all three entries are unchanged

  Scenario: All fourteen sample concepts are offered
    Then the sample concepts are Criminal, Drifter, Entertainer, Intellectual, Investigator, Kid, Outsider, Politician, Professional, Reporter, Scenester, Socialite, Soldier and Worker

  Scenario: Choosing a sample concept
    When I choose the sample concept "Intellectual"
    Then "Intellectual" reads "Selected"
    And a short description of Intellectual is shown
    And the character panel's Concept row reads "Intellectual"

  Scenario: Choosing a second sample concept replaces the first
    Given the sample concept "Intellectual" is selected
    When I choose the sample concept "Soldier"
    Then "Soldier" reads "Selected"
    And "Intellectual" does not read "Selected"
    And the character panel's Concept row reads "Soldier"

  Scenario: A sample concept can be deselected
    Given the sample concept "Intellectual" is selected
    When I choose "Intellectual" again
    Then no sample concept is selected

  Scenario: A sample concept does not restrict my own text
    Given the sample concept "Intellectual" is selected
    When I enter the concept "Antiquarian"
    Then "Intellectual" still reads "Selected"
    And the concept field holds "Antiquarian"

  Scenario Outline: The finished character's Concept combines both parts
    Given a finishable build with sample concept "<sample>" and concept text "<text>"
    When I finish the build
    Then the sheet's Concept reads "<concept>"

    Examples:
      | sample       | text        | concept                    |
      | Intellectual | Antiquarian | Intellectual · Antiquarian |
      | Intellectual |             | Intellectual               |
      |              | Antiquarian | Antiquarian                |
      |              |             |                            |

  Scenario: A whitespace-only concept text is ignored
    Given a finishable build with sample concept "Intellectual" and the concept text set to spaces only
    When I finish the build
    Then the sheet's Concept reads "Intellectual"

  Scenario: What keeps you going reaches the character's notes
    Given a finishable build with "I preserve the stories others would erase" under "What keeps you going?"
    When I finish the build
    Then the character's notes contain that text

  Scenario: An empty drive leaves the notes empty
    Given a finishable build with nothing under "What keeps you going?"
    When I finish the build
    Then the character's notes are empty

  Scenario: Screen standards
    When I choose Clan in the sidebar and then Character concept
    Then focus is on the Character concept heading
    And there is exactly one h1
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px

  Scenario: Screen standards with a sample concept selected
    Given the sample concept "Intellectual" is selected
    Then axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px
