Feature: The builder shell reflects the build and its save state

  Background:
    Given I have just started a build

  Scenario: An unnamed build
    Then the identity bar reads "Unnamed character" with the initials "?"
    And the top bar reads "Character builder"
    And the Nature / Demeanor readout reads "Not chosen"

  Scenario: The identity bar follows what I enter
    Given a build named "Éloïse Voss" with Toreador chosen, concept "Antiquarian" and chronicle "The Glass City"
    Then the identity bar reads "Éloïse Voss" with the initials "ÉV"
    And its subtitle reads "Toreador · Antiquarian · The Glass City"
    And the top bar reads "The Glass City / Character builder"

  Scenario Outline: The subtitle leaves out what is not set
    Given a build with clan "<clan>", concept "<concept>" and chronicle "<chronicle>"
    Then the subtitle reads "<subtitle>"

    Examples:
      | clan    | concept     | chronicle      | subtitle                           |
      | Toreador|             |                | Toreador                           |
      |         | Antiquarian |                | Antiquarian                        |
      |         |             | The Glass City | The Glass City                     |
      | Toreador| Antiquarian | The Glass City | Toreador · Antiquarian · The Glass City |
      |         |             |                |                                    |

  Scenario Outline: The Nature / Demeanor readout
    Given a build with Nature "<nature>" and Demeanor "<demeanor>"
    Then the readout reads "<readout>"

    Examples:
      | nature    | demeanor   | readout                |
      |           |            | Not chosen             |
      | Visionary |            | Visionary / Not chosen |
      |           | Bon Vivant | Not chosen / Bon Vivant|
      | Visionary | Bon Vivant | Visionary / Bon Vivant |

  Scenario Outline: The character panel row by row
    Given <state>
    Then the "Your character" panel row <row> reads "<text>"

    Examples:
      | state                                                      | row         | text                           |
      | I have just started a build                                | Concept     | Not chosen                     |
      | a build with sample concept "Intellectual" and concept "Antiquarian" | Concept | Intellectual · Antiquarian |
      | I have just started a build                                | Clan        | Not chosen                     |
      | a build with Toreador chosen                               | Clan        | Toreador                       |
      | I have just started a build                                | Attributes  | Not allocated                  |
      | Social primary, Mental secondary and Physical tertiary, all additional dots placed | Attributes | Social 7 · Mental 5 · Physical 3 |
      | I have just started a build                                | Abilities   | Not allocated                  |
      | Knowledges 13, Skills 9 and Talents 5 placed                | Abilities   | Knowledges 13 · Skills 9 · Talents 5 |
      | I have just started a build                                | Advantages  | Not allocated                  |
      | I have just started a build                                | Freebie points | 15 remaining                |
      | a build with 10 freebie points spent                        | Freebie points | 5 remaining                 |

  Scenario: Humanity and Willpower join the panel from Finishing touches on
    Given I am on the Finishing touches screen
    Then the panel shows Humanity and Willpower with their dots

  Scenario: A successful save is shown quietly
    When I change my character's name
    Then the autosave status reads "Saved just now"
    And nothing is announced to assistive technology

  Scenario: The status ages
    Given the autosave status read "Saved just now"
    When 90 seconds pass
    Then it reads "Saved 1 min ago"

  Scenario: A refused save is shown and the builder stays usable
    Given the browser refuses to store data
    When I change my character's name
    Then the autosave status reads "Changes not saved" and says what to do
    And it is announced as an alert
    And I can still edit the build

  Scenario: The status recovers after a later successful save
    Given the browser refused the last save and now accepts storage
    When I change my character's name
    Then the autosave status reads "Saved just now"

  Scenario: Try saving again after a failed save
    Given the browser refused the last save and now accepts storage
    And the autosave status reads "Changes not saved"
    When I choose "Try saving again"
    Then the autosave status reads "Saved just now"
    And the failure alert is gone

  Scenario: Save & exit
    Given a build named "Éloïse Voss"
    When I choose "Save & exit"
    Then I am on the character roster
    And "Éloïse Voss" is listed as in progress

  Scenario: Save & exit while saves are failing
    Given the browser refuses to store data
    When I choose "Save & exit"
    Then I am told the changes were not saved
    And I stay on the builder
