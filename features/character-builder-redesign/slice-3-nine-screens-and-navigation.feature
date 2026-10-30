Feature: Nine screens in five phases, navigable in any order

  Background:
    Given I have just started a build

  Scenario: The sidebar lists the phases and screens
    Then the sidebar lists five phases
    And it lists Character concept, Clan, Nature & Demeanor, Attributes, Abilities, Advantages, Finishing touches, Review & resolve and Character sheet
    And the current screen is marked "Current"
    And the screen counter reads "1 of 9 screens"

  Scenario: Screen states are shown as text
    Given every Attribute dot is placed and no Ability dot is placed and a clan is chosen
    Then the sidebar marks Clan "Done"
    And it marks Attributes "Done"
    And it marks Abilities "To do"
    And it marks Nature & Demeanor "Optional"
    And each state is present as text, not only as colour

  Scenario Outline: Each screen becomes done by its own rule
    Given <state>
    Then the sidebar marks <screen> "<status>"

    Examples:
      | state                                           | screen             | status |
      | a build named "Éloïse Voss"                     | Character concept  | Done   |
      | a build with no name                            | Character concept  | To do  |
      | a build with Visionary as Nature                | Nature & Demeanor  | Done   |
      | a build with a recorded Blood Pool of 10        | Finishing touches  | Done   |
      | a build with no Blood Pool recorded             | Finishing touches  | To do  |
      | a build with nothing outstanding                | Review & resolve   | Done   |
      | a build with items outstanding                  | Review & resolve   | To do  |

  Scenario: Continue is named for the next screen
    Then the primary button reads "Continue to Clan"

  Scenario Outline: Continue states its reason while a pool is unfinished
    Given a build where <unfinished>
    When I open the <screen> screen
    Then Continue is disabled
    And the text beside it reads "<reason>"
    And Continue can be reached with the keyboard

    Examples:
      | unfinished                                         | screen     | reason                                                      |
      | 1 Physical Attribute dot is unplaced               | Attributes | 1 Physical dot remains · Allocate it to continue            |
      | 2 Physical Attribute dots are unplaced             | Attributes | 2 Physical dots remain · Allocate them to continue          |
      | 2 Physical and 1 Mental Attribute dots are unplaced| Attributes | 2 Physical dots and 1 Mental dot remain · Allocate them to continue |
      | no Attribute group has a priority                  | Attributes | Rank Physical, Social and Mental to continue                |
      | Social is 4 dots over its allotment                | Attributes | Social is 4 dots over · Lower it to continue                |
      | 1 Skill dot is unplaced                            | Abilities  | 1 Skill dot remains · Allocate it to continue               |
      | no clan is chosen                                  | Clan       | Choose a clan to continue                                   |
      | no clan is chosen                                  | Advantages | Choose a clan to place Discipline dots                      |
      | 3 Background dots and 1 Virtue dot are unplaced    | Advantages | 3 Background dots and 1 Virtue dot remain · Allocate them to continue |

  Scenario: A disabled Continue does nothing
    Given a build where 1 Physical Attribute dot is unplaced
    And I am on the Attributes screen
    When I focus Continue with the keyboard and press Enter
    Then I am still on the Attributes screen
    And the reason text is still visible

  Scenario: A gate that depends on another screen offers to go there
    Given a build with no clan chosen
    When I open the Advantages screen
    Then the reason has a button "Go to Clan"
    When I choose it
    Then the Clan screen opens

  Scenario Outline: Un-gated screens can always continue
    Given a build with nothing placed
    When I open the <screen> screen
    Then Continue is enabled

    Examples:
      | screen            |
      | Character concept |
      | Nature & Demeanor |
      | Finishing touches |

  Scenario: Continue re-enables once the pool is placed
    Given a build where the last Physical Attribute dot has just been placed
    When I open the Attributes screen
    Then Continue reads "Continue to Abilities" and is enabled
    And no reason text is shown

  Scenario: The sidebar is never blocked
    Given a build where 1 Physical Attribute dot is unplaced
    And I am on the Attributes screen
    When I choose Abilities in the sidebar
    Then the Abilities screen opens

  Scenario: Reloading returns to the same screen
    Given I am on the Abilities screen
    When I reload the builder
    Then the Abilities screen is shown

  Scenario: Browser Back steps back through screens
    Given I am on the Character concept screen
    When I choose Clan in the sidebar and then Attributes
    And I use the browser Back button
    Then the Clan screen is shown

  Scenario Outline: Addresses that do not name an available screen show the first one
    When I open the builder with "<address>" as its screen
    Then the Character concept screen is shown

    Examples:
      | address         |
      | nonsense        |
      | character-sheet |

  Scenario: Navigating moves focus to the screen heading
    Given I am on the Character concept screen
    When I choose Clan in the sidebar
    Then focus is on the Clan heading
    And the page title names Clan

  Scenario: Back goes to the previous screen
    Given I am on the Clan screen
    When I choose Back
    Then the Character concept screen opens

  Scenario: Back on the first screen goes to the roster
    Given I am on the Character concept screen
    Then the Back button reads "All drafts"
    When I choose it
    Then I am on the character roster

  Scenario: The closing summary is not reachable before finishing
    Then the Character sheet item in the sidebar is not navigable
    And it says it is available after Finish
