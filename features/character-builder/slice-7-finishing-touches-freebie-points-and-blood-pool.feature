Feature: Finishing touches

  Scenario: Humanity and Willpower come from the Virtues
    Given a build with Conscience rated 4, Self-Control rated 3 and Courage rated 3
    When they open the finishing touches step
    Then Humanity is rated 7
    And Willpower is rated 3

  Scenario: Humanity follows a Virtue changed on the advantages step
    Given a build with Conscience rated 4, Self-Control rated 3 and Courage rated 3
    When they lower Conscience to 3 on the advantages step
    Then Humanity is rated 6

  # "A complete Brujah build" is one named fixture: every creation dot placed, with
  # Strength 3, Brawl 2, Celerity 1, Resources 1, Conscience 3, Self-Control 2,
  # Courage 2, no Generation dots, 13th generation.

  Scenario Outline: Each kind of trait has its freebie cost
    Given a complete Brujah build with a freebie budget of 15 and nothing spent
    When they buy one dot of <trait> with freebie points
    Then there are <left> freebie points remaining

    Examples:
      | trait                    | left |
      | the Attribute Strength   | 10   |
      | the Ability Brawl        | 13   |
      | the Discipline Celerity  | 8    |
      | the Background Resources | 14   |
      | the Virtue Courage       | 13   |
      | Humanity                 | 13   |
      | Willpower                | 14   |

  Scenario: Each section shows what a dot costs
    Given a complete Brujah build with a freebie budget of 15 and nothing spent
    When they open the finishing touches step
    Then the sections show the costs Attributes 5, Abilities 2, Disciplines 7, Backgrounds 1, Virtues 2, Humanity 2 and Willpower 1

  Scenario Outline: The freebie points remaining are shown on every step after settings
    Given a build with a freebie budget of 15 and one freebie dot of Strength
    When they open the "<step>" step
    Then the step shows 10 freebie points remaining

    Examples:
      | step              |
      | Concept           |
      | Attributes        |
      | Abilities         |
      | Advantages        |
      | Finishing touches |

  Scenario: A purchase that costs more than what is left is refused
    Given a Brujah build with 6 freebie points remaining
    When they try to buy one dot of the Discipline Celerity with freebie points
    Then they are told a Discipline dot costs 7 freebie points and only 6 remain
    And there are 6 freebie points remaining

  Scenario: Spending exactly what is left is allowed
    Given a Brujah build with 7 freebie points remaining
    When they buy one dot of the Discipline Celerity with freebie points
    Then there are 0 freebie points remaining

  Scenario: Removing a freebie dot refunds it
    Given a build with one freebie dot of Strength and 10 freebie points remaining
    When they remove the freebie dot of Strength
    Then there are 15 freebie points remaining

  Scenario: Freebie points cannot remove creation dots
    Given a build where Strength is rated 3 from creation dots and has no freebie dots
    When they try to lower Strength to 2 on the finishing touches step
    Then they are told creation dots are changed on the Attributes step, with a link to it
    And Strength is rated 3

  Scenario: Freebie points cannot remove a free dot
    Given a build where Stamina is rated 1 from its free dot
    When they try to lower Stamina to 0 on the finishing touches step
    Then Stamina is rated 1
    And Stamina reports 1 as its lowest rating

  Scenario: A trait with freebie dots says where its dots came from
    Given a build where Strength is rated 3 from creation dots plus one freebie dot
    When they look at Strength on the attributes step
    Then Strength is rated 4
    And Strength is announced as 3 from creation and 1 from freebie points

  Scenario: Freebie points can be spent in a group that has no rank
    Given a build with no Attribute ranks and a freebie budget of 15
    When they buy one dot of the Attribute Strength with freebie points
    Then Strength is rated 2
    And there are 10 freebie points remaining

  Scenario: Lowering creation dots keeps the freebie dots
    Given a build where Strength is rated 3 from creation dots plus one freebie dot, with 10 freebie points remaining
    When they lower Strength to 3 on the attributes step
    Then Strength is rated 3
    And there are 10 freebie points remaining
    And the Physical group has one more dot remaining than before

  Scenario: Freebie dots are removed on the finishing touches step, not the creation step
    Given a build where Strength is rated 1 from its free dot plus one freebie dot
    When they try to lower Strength to 1 on the attributes step
    Then they are told freebie dots are removed on Finishing touches, with a link to it
    And Strength is rated 2

  Scenario: Freebie points take an Ability above 3
    Given a build where Brawl is rated 3 from creation dots
    When they buy one dot of the Ability Brawl with freebie points
    Then Brawl is rated 4

  Scenario Outline: The generation sets the highest rating freebie points can reach
    Given a <generation> generation build with 100 freebie points remaining
    When they look at <trait> on the finishing touches step
    Then <trait> reports <highest> as its highest rating

    Examples:
      | generation | trait                    | highest |
      | 13th       | the Ability Brawl        | 5       |
      | 13th       | the Background Resources | 5       |
      | 7th        | the Background Resources | 6       |
      | 7th        | the Discipline Celerity  | 6       |

  Scenario: Freebie points take a trait up to a raised maximum
    Given a 7th generation build where Resources is rated 5 and 100 freebie points remain
    When they buy one dot of the Background Resources with freebie points
    Then Resources is rated 6

  Scenario: The Generation background stops at five dots even when other traits may go higher
    Given a build with base generation "11th", the Generation background rated 5 and 100 freebie points remaining
    When they look at the Backgrounds on the finishing touches step
    Then Generation reports 5 as its highest rating
    And Resources reports 7 as its highest rating
    And the effective generation is "6th"

  Scenario: Freebie Generation dots improve the effective generation
    Given a complete build with base generation "13th" and a freebie budget of 15
    When they buy one dot of the Background Generation with freebie points
    Then the effective generation is "12th"

  Scenario: Freebie Generation dots cannot pass 4th generation either
    Given a build with base generation "5th", the Generation background rated 1 and 100 freebie points remaining
    When they try to buy one dot of the Background Generation with freebie points
    Then they are told the effective generation cannot be better than 4th
    And the freebie points remaining are unchanged

  Scenario: A Nosferatu cannot buy Appearance
    Given a complete build of clan "Nosferatu" with a freebie budget of 15 and nothing spent
    When they open the finishing touches step
    Then Appearance is rated 0 and is announced as fixed for Nosferatu
    And there are 15 freebie points remaining

  Scenario: Becoming a Nosferatu refunds freebie dots of Appearance
    Given a build of clan "Toreador" with one freebie dot of Appearance and 10 freebie points remaining
    When they choose the clan "Nosferatu" and confirm
    Then they are told Appearance was set to 0 and 5 freebie points were refunded
    And there are 15 freebie points remaining

  Scenario: Freebie points buy a Discipline outside the clan
    Given a complete Brujah build with a freebie budget of 15 and nothing spent
    When they add the Discipline "Auspex" with freebie points
    Then Auspex is rated 1
    And there are 8 freebie points remaining

  Scenario: Freebie points buy a write-in Discipline
    Given a complete Brujah build with a freebie budget of 15 and nothing spent
    When they add a write-in Discipline "Melpominee" with freebie points
    Then Melpominee is rated 1
    And there are 8 freebie points remaining

  Scenario: Removing a freebie Discipline refunds it and frees its place
    Given a Brujah build with the freebie Discipline "Auspex" rated 1 and 8 freebie points remaining
    When they remove the freebie dot of Auspex
    Then there are 15 freebie points remaining
    And Auspex is no longer among the build's Disciplines

  Scenario: A clan change keeps Disciplines bought with freebie points
    Given a Brujah build with Potence rated 2: 1 from a creation dot and 1 from a freebie dot
    When they choose the clan "Toreador" and confirm
    Then Potence is rated 1, from the freebie dot

  Scenario: A write-in Discipline cannot repeat one the build has
    Given a Brujah build with Celerity rated 1 and 15 freebie points remaining
    When they try to add a write-in Discipline "celerity " with freebie points
    Then they are told the build already has Celerity
    And there are 15 freebie points remaining

  Scenario Outline: A character holds at most six of each advantage
    Given a build that holds five <kind> and has 100 freebie points remaining
    When they buy a sixth with freebie points
    Then the build holds six <kind>
    And trying to buy a seventh is refused because a character holds at most six <kind>
    And the freebie points remaining are unchanged by the refusal

    Examples:
      | kind        |
      | Disciplines |
      | Backgrounds |

  Scenario: A freebie Virtue dot does not change Humanity or Willpower
    Given a build with Conscience rated 4, Self-Control rated 3 and Courage rated 3
    When they buy one dot of the Virtue Courage with freebie points
    Then Courage is rated 4
    And Willpower is rated 3
    And Humanity is rated 7

  Scenario Outline: Humanity and Willpower stop at 10
    Given a build with <trait> rated 9 and 100 freebie points remaining
    When they buy one dot of <trait> with freebie points
    Then <trait> is rated 10
    And <trait> reports 10 as its highest rating

    Examples:
      | trait     |
      | Humanity  |
      | Willpower |

  Scenario: Raising a Virtue is refused when it would push Humanity above 10
    Given a build with Conscience rated 5, Self-Control rated 3 and two freebie dots of Humanity
    When they try to raise Self-Control to 4 on the advantages step
    Then they are told to remove a freebie dot of Humanity first, with a link to Finishing touches
    And Self-Control is rated 3
    And Humanity is rated 10

  Scenario: Extra freebie points cannot be cut below what is spent
    Given a build with 75 extra freebie points and 40 freebie points spent
    When they enter "20" as the extra freebie points
    Then they are told 40 freebie points are spent, so at least 5 points of purchases must be removed first, with a link to Finishing touches
    And the freebie budget is still 90

  Scenario: Extra freebie points can be cut to exactly what is spent
    Given a build with 75 extra freebie points and 40 freebie points spent
    When they set the extra freebie points to 25
    Then there are 0 freebie points remaining

  Scenario: The blood pool is entered by the player
    Given a 13th generation build
    When they enter 7 as the starting blood pool
    Then the starting blood pool is 7

  Scenario: The blood pool starts at 0
    Given a player who has started building a character
    When they open the finishing touches step
    Then the starting blood pool is 0

  Scenario Outline: The blood pool cannot leave the generation's range
    Given a build with base generation "<generation>"
    When they enter "<entry>" as the starting blood pool
    Then they are told, beside the field, that the blood pool must be a whole number from 0 to <max>
    And the starting blood pool is still 0

    Examples:
      | generation | entry | max |
      | 13th       | 11    | 10  |
      | 13th       | -1    | 10  |
      | 8th        | 16    | 15  |

  Scenario: A generation change that would put the blood pool out of range is refused
    Given a build with base generation "8th" and a starting blood pool of 15
    When they try to set the base generation to "13th"
    Then they are told to lower the starting blood pool to 10 first, with a link to Finishing touches
    And the base generation is "8th"

  Scenario: Freebie purchases survive a reload
    Given a build with one freebie dot of Strength and a starting blood pool of 4
    When they reload the builder
    Then there are 10 freebie points remaining
    And the starting blood pool is 4

  Scenario Outline: Earlier steps stay accessible with freebie dots and the freebie bar
    Given a build with freebie dots in every section, a freebie Discipline and a blood pool
    When the "<step>" step is checked
    Then no WCAG 2.1 AA violations are reported
    And every control has a unique, non-empty accessible name
    And at 375 pixels wide the page does not scroll horizontally
    And at 375 pixels wide no focused control is covered by the freebie bar or a group readout

    Examples:
      | step       |
      | Concept    |
      | Attributes |
      | Abilities  |
      | Advantages |

  Scenario: The finishing touches step is accessible and fits a phone
    Given a build with freebie dots in every section, a freebie Discipline and a blood pool
    When the finishing touches step is checked with every section open
    Then no WCAG 2.1 AA violations are reported
    And every control has a unique, non-empty accessible name
    And at 375 pixels wide the page does not scroll horizontally
    And the freebie points remaining bar does not cover the focused control
