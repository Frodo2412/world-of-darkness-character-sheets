Feature: Advantages step

  Scenario: Discipline dots can go on one Discipline or several
    Given a build of clan "Brujah"
    When they raise Celerity to 2
    And they raise Potence to 1
    Then there are 0 Discipline dots remaining

  Scenario: A fourth Discipline dot is refused
    Given a build of clan "Brujah" with Celerity rated 3
    When they try to raise Potence to 1
    Then they are told there are no Discipline dots remaining and more can be bought with freebie points on Finishing touches
    And Potence is rated 0

  Scenario Outline: A write-in Discipline needs a usable name
    Given a build of clan "Caitiff" with the Discipline "Protean"
    When they try to add a write-in Discipline "<name>"
    Then they are told <reason>
    And the Disciplines are still only "Protean"

    Examples:
      | name     | reason                        |
      |          | a Discipline needs a name     |
      | protean  | the build already has Protean |

  Scenario: Changing clan asks before removing Disciplines
    Given a build of clan "Brujah" with Celerity rated 2 and Potence rated 1
    When they choose the clan "Toreador"
    Then they are asked to confirm that the Potence dot will be removed because Toreador does not have it
    And declining keeps the clan "Brujah" with Potence rated 1

  Scenario: Confirming a clan change removes only what the new clan lacks
    Given a build of clan "Brujah" with Celerity rated 2 and Potence rated 1
    When they choose the clan "Toreador" and confirm
    Then they are told the Potence dot was removed because Toreador does not have it
    And Celerity is rated 2
    And there are 1 Discipline dots remaining

  Scenario: Browsing the clan list with the keyboard removes nothing
    Given a build of clan "Brujah" with Celerity rated 2 and Potence rated 1
    When using only the keyboard they move through the clans past "Toreador" and "Tremere" and back to "Brujah"
    Then the clan is "Brujah" with Celerity rated 2 and Potence rated 1
    And keyboard focus never left the clan list

  Scenario: A clan change names every Discipline it removes
    Given a build of clan "Caitiff" with Protean rated 2 and the write-in Discipline "Flight" rated 1
    When they choose the clan "Brujah" and confirm
    Then they are told the Protean and Flight dots were removed
    And there are 3 Discipline dots remaining

  Scenario: A clan change that removes nothing says nothing
    Given a build of clan "Brujah" with Celerity rated 2
    When they choose the clan "Toreador"
    Then no confirmation was asked
    And no clan-change notice is shown
    And Celerity is rated 2

  Scenario: Becoming a Caitiff keeps every Discipline
    Given a build of clan "Brujah" with Celerity rated 2 and Potence rated 1
    When they choose the clan "Caitiff"
    Then Celerity is rated 2
    And Potence is rated 1

  Scenario: Backgrounds come from the sourcebook list
    Given a player who has started building a character
    When they look at the Background choices
    Then the choices are exactly
      | Allies | Alternate Identity | Black Hand Membership | Contacts | Domain | Fame | Generation | Herd | Influence | Mentor | Resources | Retainers | Rituals | Status |

  Scenario: Generation dots improve the effective generation
    Given a build with base generation "11th"
    When they raise the Generation background to 2
    Then they are told, beside Generation, that the effective generation is now 9th with a Blood Pool maximum of 14
    And the Creation settings show the effective generation "9th" beside the base generation "11th"
    And the blood points per turn are 2

  Scenario: Generation dots raise what other traits may reach
    Given a build with base generation "8th", Physical ranked primary and Strength rated 5
    When they raise the Generation background to 1
    And they raise Strength to 6
    Then Strength is rated 6

  Scenario: A 4th generation base accepts no Generation dots
    Given a build with base generation "4th"
    When they try to raise the Generation background to 1
    Then they are told the effective generation cannot be better than 4th
    And the Generation background is rated 0

  Scenario: A Virtue offers five dots, whatever the generation
    Given a 4th generation build
    When they open the advantages step
    Then Courage reports 5 as its highest rating
    And Resources reports 9 as its highest rating

  Scenario: A Virtue keeps its free dot
    Given a player on the advantages step
    When they try to lower Conscience to 0
    Then Conscience is rated 1
    And Conscience reports 1 as its lowest rating

  Scenario: An eighth Virtue dot is refused
    Given a build with Conscience rated 4, Self-Control rated 3 and Courage rated 3
    When they try to raise Courage to 4
    Then they are told there are no Virtue dots remaining and more can be bought with freebie points on Finishing touches
    And Courage is rated 3

  Scenario: Removing Generation dots is refused while a trait depends on them
    Given a build with base generation "8th", the Generation background rated 1 and Strength rated 6
    When they try to lower the Generation background to 0
    Then they are told to lower Strength to 5 first, with a link to the Attributes step
    And the effective generation is "7th"

  Scenario: Choosing a less potent base generation is refused while a trait depends on it
    Given a build with base generation "7th" and Strength rated 6
    When they try to set the base generation to "8th"
    Then they are told to lower Strength to 5 first, with a link to the Attributes step
    And the base generation is "7th"
    When they follow the link to the Attributes step
    Then the dialog is closed and the "Attributes" step is shown with keyboard focus on its heading

  Scenario: Choosing a more potent base generation is refused when Generation dots would pass 4th
    Given a build with base generation "6th" and the Generation background rated 2
    When they try to set the base generation to "5th"
    Then they are told to lower the Generation background to 1 first, with a link to the Advantages step
    And the base generation is "6th"

  Scenario: Settings can change when nothing is invalidated
    Given a 13th generation build with Strength rated 4 and Resources rated 3
    When they set the base generation to "10th"
    And they set the extra freebie points to 30
    Then Strength is rated 4
    And Resources is rated 3
    And the freebie budget is 45

  Scenario: Advantage choices survive a reload
    Given a build of clan "Ventrue" with Dominate rated 2, Resources rated 4 and Courage rated 3
    When they reload the builder
    Then Dominate is rated 2
    And Resources is rated 4
    And Courage is rated 3
