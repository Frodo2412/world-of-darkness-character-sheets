Feature: The Clan screen

  Background:
    Given I am on the Clan screen of a new build

  Scenario: Browsing the clans
    Then 14 clans are listed with "All Clans · 14"
    And the selection count reads "Selected · 0/1"
    And each clan shows a short description line

  Scenario: Searching the clans
    When I search the clans for "ven"
    Then only Ventrue is listed
    And the clan count heading reads "All Clans · 1"
    And the clan result count "1 clan listed" is announced

  Scenario: A search with no match
    When I search the clans for "zzz"
    Then no clans are listed
    And I am told no clan matches and it is announced

  Scenario: Choosing a clan shows its Disciplines
    When I choose Toreador
    Then Toreador reads "Selected" and the count reads "Selected · 1/1"
    And the detail panel lists Auspex, Celerity and Presence
    And the character panel's Clan row reads Toreador

  Scenario: The clans can be browsed with the arrow keys
    When I move through the clan list with the arrow keys
    Then focus moves from one clan to the next and a clan is chosen only when I select it

  Scenario: Caitiff has no fixed Disciplines
    When I choose Caitiff
    Then the detail panel says any Discipline is available
    And the "Not sure yet?" note says Caitiff is a clan choice distinct from leaving the clan unchosen

  Scenario: Nosferatu's rule is stated
    When I choose Nosferatu
    Then the detail panel says Appearance is fixed at 0
    And the detail panel notes that only Nosferatu's Appearance rule changes creation arithmetic

  Scenario: Changing clan with nothing to remove does not prompt
    Given a Brujah build with no Discipline dots
    When I choose Toreador
    Then Toreador is chosen with no confirmation

  Scenario: Changing clan that would remove Discipline dots asks first
    Given a Brujah build with creation dots in Celerity, Potence and Presence
    When I choose Toreador
    Then I am told that the Potence dots would be removed
    When I confirm the switch
    Then the Potence dots are removed and I am told so

  Scenario: Keeping the current clan
    Given a Brujah build with creation dots in Celerity, Potence and Presence
    When I choose Gangrel and then keep Brujah
    Then Brujah is still chosen and no dots were removed

  Scenario: Switching to Nosferatu when Appearance holds dots
    Given a Toreador build with 2 creation dots on Appearance
    When I choose Nosferatu
    Then I am told the Appearance dots would be removed
    When I confirm the switch
    Then Appearance is fixed at 0

  Scenario: Switching away from Nosferatu releases Appearance
    Given a Nosferatu build
    When I choose Toreador
    Then Appearance can take creation dots again

  Scenario Outline: The search shortcut on each platform
    Given the platform is "<platform>"
    When I press <keys>
    Then focus is in the clan search field
    And the clan search hint reads "<hint>"

    Examples:
      | platform | keys      | hint   |
      | macOS    | Meta+K    | ⌘K     |
      | other    | Control+K | Ctrl K |

  Scenario: Screen standards
    When I choose Character concept in the sidebar and then Clan
    Then focus is on the Clan heading
    And there is exactly one h1
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px

  Scenario: Screen standards with a clan selected and a confirmation shown
    Given a Brujah build with creation dots in Celerity, Potence and Presence
    When I choose Toreador
    Then the switch confirmation is shown
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px
